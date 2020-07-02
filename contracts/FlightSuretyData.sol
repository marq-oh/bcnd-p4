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

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AirlineRegistered(address registered, address registerer);
    event AirlineFunded(address funded);

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

    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;
    }

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
    modifier requireAirlineRegisteredFunded(address airline) {
        require(airlines[airline].isRegistered == true, 'Airline Registerer is not registered');
        require(airlines[airline].isFunded == true, 'Airline Registerer is not funded');
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

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy() external payable
    {

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees() external pure
    {
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay() external pure
    {
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

    function getFlightKey(address airline, string memory flight, uint256 timestamp) pure internal returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

}

