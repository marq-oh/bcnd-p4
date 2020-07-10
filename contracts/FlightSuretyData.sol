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
    }

    // MSJ: Mapping the address of the airline with the airline's struct record
    mapping(address => Airline) private airlines;

    // MSJ: Array to keep track of registered + funded airlines
    address[] airlinesRegistration;
    address[] airlinesRegisteredFunded;

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
        uint256 timestamp;   
        address airline;
        string flight;
    }
    
    // MSJ: Mapping bytes32 to flights
    mapping(bytes32 => Flight) private flights;
    
    // MSJ: Bytes32 data to keep track of registered flights
    bytes32[] registeredFlights;

    // MSJ: Insurance struct
    struct Insurance {
        address passenger;
        bytes32 flightKey;
        string flight;
        address airline;
        uint256 timestamp;        
        uint256 amount;
        bool isCredited;
    }

    // MSJ: Mappings
    mapping (bytes32 => uint) private insuredFlightKey;
    mapping (address => uint) private insuredPassenger;
    Insurance[] insuredFlightKeyPassengers;

    // MSJ: Pending Payments struct
    struct PendingPayments {
        address passenger;
        bytes32 flightKey;
        string flight;
        address airline;
        uint256 timestamp;        
        uint256 amount;
        bool isPaid;
    }

    // MSJ: Mappings
    mapping (bytes32 => uint) private pendingPaymentFlightKey;
    mapping (address => uint) private pendingPaymentPassenger;
    PendingPayments[] pendingPaymentsFlightKeyPassengers;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    // MSJ: Events
    event AirlineRegistered(address registered, address registerer);
    event AirlineFunded(address funded);
    event FlightRegistered(bytes32 flightKey, string flight, uint256 timestamp, address registerer);
    event InsurancePurchased(address passenger, bytes32 flightKey, string flight, address airline, uint256 timestamp);
    event InsureeCredited(address passenger, uint256 amount);

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

    function _getFlightKey(address airline, string calldata flight, uint256 timestamp) external pure returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // MSJ: Update flight status code
    function updateFlightStatusCode(bytes32 flightkey, uint8 statusCode) external 
    {     
       flights[flightkey].statusCode = statusCode;
       
       //return flights[flightkey].statusCode;
    }

    // MSJ: Get flight status code
    function getFlightStatusCode(bytes32 flightkey) external view returns(uint8) 
    {     
        return flights[flightkey].statusCode;
    }
    
    // MSJ: Function to check if passenger is insured
    function isInsured(address passenger, address airline, string calldata flight, uint256 timestamp) external view returns (bool) 
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        
        if(insuredFlightKeyPassengers[insuredFlightKey[flightKey]].passenger == passenger)
        {
            return true;
        }
        
        return false;
    }
    
    // MSJ: Function to get pending payment
    function getPendingPayment(address passenger) external view returns (uint256)
    {
        return pendingPaymentsFlightKeyPassengers[pendingPaymentPassenger[passenger]].amount;
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
            isFunded: false
        });

        airlinesRegistration.push(applicant); 

        emit AirlineRegistered(applicant, registerer);

        // return status;
    }

    // MSJ: Fund Airline
    function submitAirlineFunding(address airline) external payable
             requireIsOperational
             requireIsCallerAuthorized
             returns(bool)
    {
        // MSJ: Airline has to be registered
        require(airlines[airline].isRegistered == true, 'Airline not registered');
 
        airlines[airline].isFunded = true;
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
        // MSJ: Only registered + funded airlines can register
        require(airlines[registerer].isRegistered == true, 'Airline not registered');
        require(airlines[registerer].isFunded == true, 'Airline not funded');

        // MSJ: Check that flight has not been registered yet
        bytes32 flightKey = getFlightKey(registerer, flight, timestamp);
        require(flights[flightKey].isRegistered == false, "Flight has already been registered");
        
        flights[flightKey].flight = flight;
        flights[flightKey].timestamp = timestamp;
        flights[flightKey].airline = registerer;
        flights[flightKey].isRegistered = true;
        flights[flightKey].statusCode = STATUS_CODE_UNKNOWN;

        registeredFlights.push(flightKey); 

        emit FlightRegistered(flightKey, flight, timestamp, registerer);

    }

    function getFlightKey(address airline, string memory flight, uint256 timestamp) pure internal returns(bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }
    
    // MSJ: To credit all insurees for airline fault delay for applicable flight
    function creditInsurees(address airline, string calldata flight, uint256 timestamp) external requireIsOperational requireIsCallerAuthorized 
    {
        // MSJ: Check whether airlines is registered + funded
        require(airlines[airline].isRegistered == true, 'Airline not registered');
        require(airlines[airline].isFunded == true, 'Airline not funded');

        // MSJ: Check whether flight is registered
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        require(flights[flightKey].isRegistered == true, "Flight not registered");
        
        // MSJ: Loop through all insurees who purchased insurance for this flight
        for (uint i = 0; i < insuredFlightKeyPassengers.length; i++)
        {
            if(insuredFlightKeyPassengers[insuredFlightKey[flightKey]].flightKey == flightKey)
            {
                // MSJ: Add record to PendingPayments
                uint256 amount = insuredFlightKeyPassengers[insuredFlightKey[flightKey]].amount.mul(150).div(100);
                
                pendingPaymentsFlightKeyPassengers.push(PendingPayments(
                                                            insuredFlightKeyPassengers[insuredFlightKey[flightKey]].passenger, 
                                                            insuredFlightKeyPassengers[insuredFlightKey[flightKey]].flightKey, 
                                                            insuredFlightKeyPassengers[insuredFlightKey[flightKey]].flight, 
                                                            insuredFlightKeyPassengers[insuredFlightKey[flightKey]].airline, 
                                                            insuredFlightKeyPassengers[insuredFlightKey[flightKey]].timestamp, 
                                                            amount,
                                                            false));
                
                // MSJ: Update isCredited record
                insuredFlightKeyPassengers[insuredFlightKey[flightKey]].isCredited = true;
                emit InsureeCredited(insuredFlightKeyPassengers[insuredFlightKey[flightKey]].passenger, insuredFlightKeyPassengers[insuredFlightKey[flightKey]].amount);
            }
        }
    }
    
    // MSJ: For passenger to buy insurance
    function buy(address passenger, string calldata flight, address airline, uint256 timestamp, uint256 amount) external payable
             requireIsOperational
             requireIsCallerAuthorized
             returns(bool)
    {        
        // MSJ: Check whether airlines is registered + funded
        require(airlines[airline].isRegistered == true, 'Airline not registered');
        require(airlines[airline].isFunded == true, 'Airline not funded');

        // MSJ: Check whether flight is registered
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        require(flights[flightKey].isRegistered == true, "Flight not registered");

        // MSJ: Add insured flightKey record
        insuredFlightKeyPassengers.push(Insurance(passenger, flightKey, flight, airline, timestamp, amount, false));

        emit InsurancePurchased(passenger, flightKey, flight, airline, timestamp);
        return true;
    }

    function pay(address passenger) external view requireIsOperational requireIsCallerAuthorized returns(uint256)
    {
        require(pendingPaymentsFlightKeyPassengers[pendingPaymentPassenger[passenger]].isPaid == false, "No eligible for credit");

        uint256 amount = pendingPaymentsFlightKeyPassengers[pendingPaymentPassenger[passenger]].amount;
        
        pendingPaymentsFlightKeyPassengers[pendingPaymentPassenger[passenger]].isPaid == true;
        pendingPaymentsFlightKeyPassengers[pendingPaymentPassenger[passenger]].amount == 0;
        
        return amount;
    }
    
    function getPassengerFunds(address passenger) external view returns(uint) 
    {
        return passenger.balance;
    }
    
    function getContractBalance() external view returns(uint) 
    {
        return address(this).balance;
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

