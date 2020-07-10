pragma solidity ^0.6;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyApp {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // MSJ: State variable to interface with FlightSuretyData contract
    FlightSuretyData flightSuretyData;
    
    // MSJ: Account used to deploy contract
    address private contractOwner;
    
     // MSJ: Constants
    uint256 constant AIRLINE_REG_FEE = 10 ether;
    uint256 constant MAX_FLIGHT_INSURANCE_PAY = 1 ether;
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    // MSJ: Airlines Registration Queue
    struct AirlineRegistrationQueue {
        address registerer;
        uint256 votes;
        bool isQueued;
    }

    // MSJ: Mapping the address of the airline's address with registration status
    mapping(address => AirlineRegistrationQueue) private registrationQueue;
    
    // MSJ: Array to keep track of airline registration queue
    address[] airlineRegQueue;
    
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    // MSJ: Events
    event AirlineRegistrationQueued(address queued, address registerer);
    event VotedForAirline(address voted, address voter);
    event FlightRegistered(string flight, uint256 timestamp, address airline);
    event FlightStatusUpdated(address airline, string flight, uint256 timestamp, uint8 statusCode);

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    // MSJ: Constructor
    constructor(address payable dataContract) public
    {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContract);
    }
    
    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // MSJ: Modifier to verify address is registered
    modifier requireIsOperational() 
    {
        // Modify to call data contract's status
        require(flightSuretyData.isOperational(), "Contract is currently not operational");  
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    // MSJ: Modifier to verify contract owner
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    // MSJ: Modifier to verify address is registered
    modifier requireIsAirlineRegistered(address airline) {
        require(flightSuretyData.isAirlineRegistered(airline) == true, 'Caller is not the authorized app contract');
        _;
    }

    // MSJ: Modifier to verify address is Funded
    modifier requireIsAirlineFunded(address airline) {
        require(flightSuretyData.isAirlineFunded(airline) == true, 'Caller is not the authorized app contract');
        _;
    }
    
    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    // MSJ: To check if contract isOperational()
    function isOperational() external view returns(bool) {
        return flightSuretyData.isOperational();
    }

    // MSJ: Get list of registered airlines
    function getAirlinesRegistration() public view returns(address[] memory) 
    {
        address[] memory airlinesRegistration = flightSuretyData.getAirlinesRegistration();

        return airlinesRegistration;
    }
    
    // MSJ: Get list of funded airlines
    function getAirlinesFunded() public view returns(address[] memory) 
    {
        address[] memory airlinesFunded = flightSuretyData.getAirlinesRegisteredFunded();

        return airlinesFunded;
    }
    
    // MSJ: Function to get airline registration queue
    function getQueued() public view returns(address[] memory) 
    {
        return airlineRegQueue;
    }

    // MSJ: Function to verify address is queue
    function isAirlineQueued(address airline) external view returns(bool) 
    {     
        return registrationQueue[airline].isQueued;
    }

    // MSJ: Get votes
    function getVotes(address airline) external view returns(uint256) 
    {     
        return registrationQueue[airline].votes;
    }
    
    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    // MSJ: Register Airline
    function registerAirline(address applicant) public
    {
        address[] memory airlinesRegisteredFunded = flightSuretyData.getAirlinesRegistration();

        // MSJ: Register airline if there are less than 5 registered airlines altogether
        if(airlinesRegisteredFunded.length < 5) 
        {
            flightSuretyData.registerAirline(applicant, msg.sender);
        }
        // MSJ: Add airline registration to queue, to run through voting process
        else 
        {
            // add check that airline is not yet in queue
            registrationQueue[applicant].registerer = msg.sender;
            registrationQueue[applicant].votes = 0;
            registrationQueue[applicant].isQueued = true;
            
            airlineRegQueue.push(applicant); 

            emit AirlineRegistrationQueued(applicant, msg.sender);
        }
    }
    
    // MSJ: Function to allow other registered airlines to vote
    function voteForAirline(address applicant) public
    {
        // MSJ: Get total count of participating airlines
        address[] memory participatingAirlines = flightSuretyData.getAirlinesRegisteredFunded();
        uint256 currentRegistration = participatingAirlines.length;
        
        // MSJ: Get 50% if participating airlines
        uint256 requiredConsensus = currentRegistration.div(2);

        // MSJ: Get applicant's current votes
        uint256 currentApplicantVotes = registrationQueue[applicant].votes;
        
        // MSJ: Increment votes
        currentApplicantVotes = currentApplicantVotes.add(1);
        registrationQueue[applicant].votes = currentApplicantVotes;

        // MSJ: Check if there are enough votes
        if(currentApplicantVotes >= requiredConsensus)
        {
            // MSJ: If required vote consensus is met, proceed with registration (but not yet funded)
            flightSuretyData.registerAirline(applicant, msg.sender);
            registrationQueue[applicant].isQueued = false;
        }

        emit VotedForAirline(applicant, msg.sender);
    }

    
    // MSJ: For airline to submit registration funding so they can start participating
    function submitFunding() payable external 
    {
        require(msg.value == AIRLINE_REG_FEE, "Invalid funds submitted. Please submit required airline registration fee.");
               
        // MSJ: Submit funding
        // address(uint160(address(flightSuretyData))).transfer(msg.value);
        flightSuretyData.submitAirlineFunding{value: msg.value}(msg.sender);
    }
    
    // MSJ: For Airline to register flight
    function registerFlight(string memory flight, uint256 timestamp) public
    {
        // MSJ: Register flight (Flight No. and Timestamp)
        flightSuretyData.registerFlight(flight, timestamp, msg.sender);

        emit FlightRegistered(flight, timestamp, msg.sender);

    }
    
    // MSJ: For passengers to purchase insurance
    function purchaseFlightInsurance(string calldata flight, address airline, uint256 timestamp) payable external 
    {
        require(msg.value > 0 && msg.value <= MAX_FLIGHT_INSURANCE_PAY, "Invalid funds submitted. Please adhere to insurance fee requirements.");
        
        // MSJ: Submit funding
        flightSuretyData.buy{value: msg.value}(msg.sender, flight, airline, timestamp, msg.value);    
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(address airline, string calldata flight, uint256 timestamp) external 
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({requester: msg.sender, isOpen: true});

        emit OracleRequest(index, airline, flight, timestamp);
    }

    // MSJ: For insured passenger to withdraw their eligible funds
    event CreditsWithdrawn(address passenger, uint256 amount);
    
    function withdrawFunds() public requireIsOperational 
    {
        require(flightSuretyData.getPendingPayment(msg.sender) > 0, "Insufficient.");
        
        uint256 withdrawAmount;
        withdrawAmount = flightSuretyData.pay(msg.sender);
        
        address payable to = msg.sender;
        
        to.transfer(withdrawAmount);
        emit CreditsWithdrawn(msg.sender, withdrawAmount);
    }
    
    // MSJ: Get Contract Balanve
    function getContractBalance() public requireIsOperational returns(uint)
    {
        return flightSuretyData.getContractBalance();
    }
    
    
    // MSJ: For insured passenger to get their balance
    function getPassengerFunds() public payable requireIsOperational returns(uint)
    {
        return flightSuretyData.getPassengerFunds(msg.sender);
    }
    
    /********************************************************************************************/
    /*                                     ORACLE MANAGEMENT                                    */
    /********************************************************************************************/
    
    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle 
    {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo 
    {
        address requester;                          // Account that requested status
        bool isOpen;                                // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;      // Mapping key is the status code reported
                                                    // This lets us group responses and identify
                                                    // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);

    // Register an oracle with the contract
    function registerOracle() external payable requireIsOperational 
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }
    
    function getMyIndexes() view external returns(uint8[3] memory)
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }
    
    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(uint8 index, address airline, string calldata flight, uint256 timestamp, uint8 statusCode) external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) 
        {
            // Handle flight status as appropriate
            // processFlightStatus(airline, flight, timestamp, statusCode);
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);
    
                // MSJ: Get FlightKey so that we can update flight status code based on what Oracle has sent
            bytes32 flightKey = getFlightKey(airline, flight, timestamp);  
    
            // MSJ: Pass Oracle's updated Flight Status Code
            flightSuretyData.updateFlightStatusCode(flightKey, statusCode);
    
            // MSJ: If unknown status code, request for Oracle to get another update
            uint8 currStatusCode = flightSuretyData.getFlightStatusCode(flightKey);
            require(currStatusCode != STATUS_CODE_UNKNOWN, "Flight Status Unknown. Please wait and request for another update.");
    
            // MSJ: If flight is late due to airline
            if(currStatusCode == STATUS_CODE_LATE_AIRLINE) 
            {
                // MSJ: Credit all passengers who have purchased insurance for this flight
                flightSuretyData.creditInsurees(airline, flight, timestamp);
            }
    
            emit FlightStatusUpdated(airline, flight, timestamp, statusCode);
        }
    }
    
    // MSJ: Called after oracle has updated flight status info (leave here in case)
    function processFlightStatus(address airline, string calldata flight, uint256 timestamp, uint8 statusCode) external 
    {    
        // MSJ: Get FlightKey so that we can update flight status code based on what Oracle has sent
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);  

        // MSJ: Pass Oracle's updated Flight Status Code
        flightSuretyData.updateFlightStatusCode(flightKey, statusCode);

        // MSJ: If unknown status code, request for Oracle to get another update
        uint8 currStatusCode = flightSuretyData.getFlightStatusCode(flightKey);
        require(currStatusCode != STATUS_CODE_UNKNOWN, "Flight Status Unknown. Please wait and request for another update.");

        // MSJ: If flight is late due to airline
        if(currStatusCode == STATUS_CODE_LATE_AIRLINE) 
        {
            // MSJ: Credit all passengers who have purchased insurance for this flight
            flightSuretyData.creditInsurees(airline, flight, timestamp);
        }

        emit FlightStatusUpdated(airline, flight, timestamp, statusCode);
    }
    
    function getFlightKey(address airline, string memory flight, uint256 timestamp) pure internal returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }
    
    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal returns(uint8[3] memory) 
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
    
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) 
        {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) 
        {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }
    
    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) 
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) 
        {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

}

// MSJ: FlightSurety data contract interface
abstract contract FlightSuretyData {
    function isOperational() public virtual view returns(bool);
    function registerAirline(address applicant, address registerer) external virtual;
    function getAirlinesRegistration() external virtual view returns(address[] memory);
    function getAirlinesFunded() external virtual view returns(address[] memory);
    function getAirlinesRegisteredFunded() external virtual view returns(address[] memory);
    function submitAirlineFunding(address airline) external virtual payable returns(bool);
    function isAirlineRegistered(address airline) external virtual view returns(bool);
    function isAirlineFunded(address airline) external virtual view returns(bool);
    function registerFlight(string calldata flight, uint256 timestamp, address registerer) external virtual;
    function getRegisteredFlights() external virtual view returns(bytes32[] memory);
    function buy(address passenger, string calldata flight, address airline, uint256 timestamp, uint256 amount) external virtual payable returns(bool);
    function getPassengerFunds(address passenger) external virtual returns(uint);
    function getContractBalance() external virtual returns(uint);
    function getPendingPayment(address passenger) external view virtual returns (uint256);
    function pay(address passenger) external virtual returns(uint256);
    function getFlightStatusCode(bytes32 flightkey) external virtual view returns(uint8);
    function updateFlightStatusCode(bytes32 flightkey, uint8 statusCode) external virtual;
    function creditInsurees(address airline, string calldata flight, uint256 timestamp) external virtual; 

}