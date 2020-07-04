pragma solidity ^0.6;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;
    bool private operational = true;
    uint private balance;
    
    // MSJ: Mapping contract address to authorizedContracts
    mapping(address => bool) private authorizedContracts;

    // MSJ: Airlines struct
    struct Airline {
        bool isRegistered;
        bool isFunded;
        uint256 deposit;
    }

    // MSJ: Mapping the address of the airline with the airline's struct record
    mapping(address => Airline) private airlines;

    // MSJ: Array to keep track of registered + funded airlines
    address[] airlinesRegistration = new address[](0);
    address[] airlinesRegisteredFunded = new address[](0);

    // MSJ: Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    // MSJ: Flights struct
    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
        string flight;
    }
    
    // MSJ: Mapping bytes32 to flights
    mapping(bytes32 => Flight) private flights;
    
    // MSJ: Bytes32 data to keep track of registered flights
    bytes32[] registeredFlights = new bytes32[](0);

    // MSJ: Insurance struct
    struct Insurance {
        address passenger;
        uint256 timestamp;        
        address airline;
        string flight;
        uint256 amount;
        uint256 multiplier;
        bool isCredited;
    }
    
    // MSJ: Bytes32 data to keep track of insured passengers
    mapping (bytes32 => Insurance[]) insuredPassengers;
    mapping (address => uint) public pendingPayments;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    // MSJ: Events
    event AirlineRegistered(address registered, address registerer);
    event AirlineFunded(address funded);
    event FlightRegistered(bytes32 flightKey, string flight, uint256 timestamp, address registerer);
    event InsurancePurchased(address passenger, string flight, address airline, uint256 timestamp);
    event FlightStatusUpdated(address airline, string flight, uint256 timestamp, uint8 statusCode);
    event InsureeCredited(address passenger, uint256 amount);
    event AccountWithdrawn(address passenger, uint256 amount);

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/
    
    // MSJ: Constructor to set contract owner and first airline
    constructor() public 
    {
        contractOwner = msg.sender;

        // MSJ: For first airline registration
        registerFirstAirline(contractOwner);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // MSJ: Modifier to check operating status
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;
    }

    // MSJ: Modifier to check for contract owner
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }
    
    // MSJ: Modifier to only allow authorized contracts to call this contract
    modifier requireIsCallerAuthorized() {
        require(authorizedContracts[msg.sender] == true, 'Caller is not the authorized app contract');
        _;
    }
    
    // MSJ: Modifier to only allow registered + funded airlines to register other airlines
    modifier requireAirlineRegisteredFunded(address registerer) {
        require(airlines[registerer].isRegistered == true, 'Airline Registerer is not registered');
        require(airlines[registerer].isFunded == true, 'Airline Registerer is not funded');
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/
    
    function isOperational() public view returns(bool) 
    {
        return operational;
    }
  
    function setOperatingStatus(bool mode) external requireContractOwner 
    {
        operational = mode;
    }

    // MSJ: Function to authorize contract(s) that can access this contract
    function authorizeCaller(address appContract) external requireContractOwner 
    {
        authorizedContracts[appContract] = true;
    }

    // MSJ: Function to authorize contract(s) that can access this contract
    function deauthorizeCaller(address appContract) external requireContractOwner 
    {
        authorizedContracts[appContract] = false;
    }

    // MSJ: Function to register first airline
    function registerFirstAirline(address firstAirline) internal requireContractOwner
    {
        airlines[firstAirline].isRegistered = true;
        airlines[firstAirline].isFunded = true; 
        airlinesRegistration.push(firstAirline); 
        airlinesRegisteredFunded.push(firstAirline); 
    }

    // MSJ: Function to verify address is registered
    function isAirlineRegistered(address airline) external view returns(bool) 
    {     
        return airlines[airline].isRegistered;
    }

    // MSJ: Function to verify address is Funded
    function isAirlineFunded(address airline) external view returns(bool) 
    {     
        return airlines[airline].isFunded;
    }

    // MSJ: Get list of registered airlines
    function getAirlinesRegistration() external view returns(address[] memory) 
    {
        return airlinesRegistration;
    }

    // MSJ: Get list of funded airlines
    function getAirlinesRegisteredFunded() external view returns(address[] memory) 
    {
        return airlinesRegisteredFunded;
    }

    // MSJ: Get list of registered flights
    function getRegisteredFlights() external view returns(bytes32[] memory) 
    {
        return registeredFlights;
    }
    
    // MSJ: Function to verify flight is registered
    function isFlightRegistered(bytes32 flightkey) external view returns(bool) 
    {     
        return flights[flightkey].isRegistered;
    }

    // MSJ: Get flight status code
    function getFlightStatusCode(bytes32 flightkey) external view returns(uint8) 
    {     
        return flights[flightkey].statusCode;
    }
    
    // MSJ: Function to check if passenger is insured
    function isInsured(address passenger, address airline, string calldata flight, uint256 timestamp) external view returns (bool) {
        Insurance[] memory insured = insuredPassengers[getFlightKey(airline, flight, timestamp)];
        for(uint i = 0; i < insured.length; i++) 
        {
            if (insured[i].passenger == passenger) 
            {
                return true;
            }
        }
        return false;
    }
    
    // MSJ: Function to get pending payment
    function getPendingPayment(address passenger) external view returns (uint256)
    {
        return pendingPayments[passenger];
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    // MSJ: Register Airline
    function registerAirline(address applicant, address registerer) external 
             requireIsOperational
             requireIsCallerAuthorized
             requireAirlineRegisteredFunded(registerer) 
             returns(bool)
    {
        //bool status = true;

        require(airlines[applicant].isRegistered == false, 'Airline is already registered');

        airlines[applicant] = Airline({
            isRegistered: true, 
            isFunded: false,
            deposit: 0
        });

        airlinesRegistration.push(applicant); 

        emit AirlineRegistered(applicant, registerer);

        // return status;
    }

    // MSJ: Fund Airline
    function fundAirline(address airline) external payable
             requireIsOperational
             requireIsCallerAuthorized
             returns(bool)
    {
        require(airlines[airline].isRegistered == true, 'Airline not registered');
 
        airlines[airline].isFunded = true;
        airlines[airline].deposit += msg.value;
        airlinesRegisteredFunded.push(airline); 
        
        emit AirlineFunded(airline);
        return true;
    }

    // MSJ: Register Flight
    function registerFlight(string calldata flight, uint256 timestamp, address registerer) external 
             requireIsOperational
             requireIsCallerAuthorized
             requireAirlineRegisteredFunded(registerer)
    {
        require(airlines[registerer].isRegistered == true, 'Airline not registered');
        require(airlines[registerer].isFunded == true, 'Airline not funded');

        bytes32 flightKey = getFlightKey(registerer, flight, timestamp);
        require(!flights[flightKey].isRegistered, "Flight has already been registered");
        
        flights[flightKey] = Flight({
          isRegistered: true,
          statusCode: 0,
          updatedTimestamp: timestamp,
          airline: registerer,
          flight: flight
        });

        registeredFlights.push(flightKey); 

        emit FlightRegistered(flightKey, flight, timestamp, registerer);

    }
    
    // MSJ: Process Flight
    function processFlightStatus(address airline, string calldata flight, uint256 timestamp, uint8 statusCode) external requireIsOperational requireIsCallerAuthorized 
    {

        bytes32 flightKey = getFlightKey(airline, flight, timestamp);    
    
        if (flights[flightKey].statusCode == STATUS_CODE_UNKNOWN) 
        {
            flights[flightKey].statusCode = statusCode;
            if(statusCode == STATUS_CODE_LATE_AIRLINE) 
            {
                creditInsurees(airline, flight, timestamp);
            }
        }

        emit FlightStatusUpdated(airline, flight, timestamp, statusCode);
    }
    
    function creditInsurees(address airline, string memory flight, uint256 timestamp) internal requireIsOperational requireIsCallerAuthorized 
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        for (uint i = 0; i < insuredPassengers[flightKey].length; i++) 
        {
            Insurance memory insurance = insuredPassengers[flightKey][i];

            if (insurance.isCredited == false) 
            {
                insurance.isCredited = true;
                uint256 amount = insurance.amount.mul(insurance.multiplier).div(100);
                pendingPayments[insurance.passenger] += amount;

                emit InsureeCredited(insurance.passenger, amount);
            }
        }
    }
    
    function getFlightKey(address airline, string memory flight, uint256 timestamp) pure internal returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }
    
    // MSJ: For passenger to buy insurance
    function buy(address passenger, string calldata flight, address airline, uint256 timestamp, uint256 amount, uint256 multiplier) external payable
             requireIsOperational
             requireIsCallerAuthorized
             returns(bool)
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        require(flights[flightKey].isRegistered == true, "Flight not registered");
        require(airlines[airline].isRegistered == true, 'Airline not registered');
        require(airlines[airline].isFunded == true, 'Airline not funded');

        insuredPassengers[flightKey].push(Insurance({
          passenger: passenger,
          timestamp: timestamp,
          airline: airline,
          flight: flight,
          amount: amount,
          multiplier: multiplier,
          isCredited: false
        }));

        
        emit InsurancePurchased(passenger, flight, airline, timestamp);
        return true;
    }
    
    // MSJ: To transfer eligible payout
    function pay(address passenger) external requireIsOperational requireIsCallerAuthorized 
    {
        require(passenger == tx.origin, "Contracts not allowed");
        require(pendingPayments[passenger] > 0, "No fund available for withdrawal");

        uint256 amount = pendingPayments[passenger];
        pendingPayments[passenger] = 0;

        address(uint160(passenger)).transfer(amount);

        emit AccountWithdrawn(passenger, amount);
    }
    
    // MSJ: Function to fund contract
    function fund(uint256 amount) internal
    {
        balance = balance.add(amount);
    }
    
    // MSJ: Fallback
    fallback() external payable {
        fund(msg.value);
    }
    
    // MSJ: Fallback
    receive() external payable {
        fund(msg.value);
    }

}

