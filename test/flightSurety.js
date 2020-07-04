
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const { NamedChunksPlugin } = require('webpack');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/
  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try 
    {
        await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
    }
    catch(e) {
        accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
          
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  /****************************************************************************************/
  /* MSJ: Added                                                                           */
  /****************************************************************************************/

  it(`Test that first airline is registered and funded upon deployment`, async function () {

    // MSJ: Get first airline registered status data
    let getAirlineRegisteredStatus = await config.flightSuretyData.isAirlineRegistered(config.owner);

    // MSJ: Get first airline funded status data
    let getAirlineFundedStatus = await config.flightSuretyData.isAirlineFunded(config.owner);

    // MSJ: Assert
    assert.equal(getAirlineRegisteredStatus, true, "First airline is not registered when contract is deployed")
    assert.equal(getAirlineFundedStatus, true, "First airline is not funded when contract is deployed")

  });

  it('Test that only registered + funded airlines can register another airline', async () => {
    
    // MSJ: Set up test account to register
    let firstAirline = accounts[1];
    let secondAirline = accounts[2];

    // MSJ: Pass firstAirline account to registerAirline() on app contract (this does not make it funded)
    await config.flightSuretyApp.registerAirline(firstAirline, {from: config.owner});

    // MSJ: Have firstAirline submit funding
    const registrationFunding = web3.utils.toWei("10", "ether");
    await config.flightSuretyApp.submitFunding({from: firstAirline, value: registrationFunding, gasPrice: 0})

    // MSJ: Verify status of firstAirline
    let registeredStatus = await config.flightSuretyData.isAirlineRegistered(firstAirline);
    let fundedStatus = await config.flightSuretyData.isAirlineFunded(firstAirline);

    // MSJ: Try to register secondAirline using firstAirline before firstAirline submits funding
    await config.flightSuretyApp.registerAirline(secondAirline, {from: firstAirline});
    let result = await config.flightSuretyData.isAirlineRegistered(secondAirline);

    // MSJ: Assert
    assert.equal(registeredStatus, true, "Airline registerer has to be registered");
    assert.equal(fundedStatus, true, "Airline registerer has to be funded");
    assert.equal(result, true, "Registered + Funded Airline can register another airline");

  });

  it('Test that airlines already in registration queue cannot be registered again', async () => {

    let result = true;
    let registered = accounts[1]; // already registered from previous tests

    // MSJ: Past 'already registered' account to registerAirline() on app contract
    try
    {
      await config.flightSuretyApp.registerAirline(registered, {from: config.owner});
    }
    catch(e) 
    {
      result = false;
    }   

    // MSJ: Assert
    assert.equal(result, false, "Airline is not yet in registration queue");

  });

  it('Test that fifth and subsequent registered airlines requires multi-party consensus of 50% of registered airlines', async () => {

    // MSJ: Set up remaining test airlines
    let airline1 = accounts[3];
    let airline2 = accounts[4];    
    let airline3 = accounts[5];
    //let airline4 = accounts[6];
    //let airline5 = accounts[7];    
    const registrationFunding = web3.utils.toWei("10", "ether");
    
    // MSJ: Register and fund airlines
    await config.flightSuretyApp.registerAirline(airline1, {from: config.owner});
    await config.flightSuretyApp.submitFunding({from: airline1, value: registrationFunding, gasPrice: 0})

    await config.flightSuretyApp.registerAirline(airline2, {from:config.owner});
    await config.flightSuretyApp.submitFunding({from: airline2, value: registrationFunding, gasPrice: 0})

    //await config.flightSuretyApp.registerAirline(airline3, {from: airline1});
    //await config.flightSuretyApp.submitFunding({from: airline3, value: registrationFunding, gasPrice: 0})

    //await config.flightSuretyApp.registerAirline(airline4, {from: airline1});
    //await config.flightSuretyApp.submitFunding({from: airline4, value: registrationFunding, gasPrice: 0})

    await config.flightSuretyApp.registerAirline(airline3, {from: config.owner});
    let queueCheck = await config.flightSuretyApp.isAirlineQueued(airline3);

    // MSJ: Registered + Funded airlines give 50% vote (i.e. 2) to Fifth Airline which allows it to be registered
    await config.flightSuretyApp.voteForAirline(airline3, {from: airline1});

    await config.flightSuretyApp.voteForAirline(airline3, {from: airline2});

    let registeredCheck = await config.flightSuretyData.isAirlineRegistered(airline3);

    // MSJ: Assert
    assert.equal(queueCheck, true, "airline3 was in registration queue");
    assert.equal(registeredCheck, true, "airline3 was registered after getting 50% votes");
  });

  it('Test that passenger may pay up to 1 ether for purchasing flight insurance', async () => {

    // MSJ: Set up
    let passenger = accounts[6];    
    let flight = "Air Udacity"; 
    let airline = accounts[3];
    let timestamp = 20200703;
    const insuranceFee = web3.utils.toWei("1", "ether");

    // MSJ: Register flight
    await config.flightSuretyApp.registerFlight(flight,timestamp, {from: airline})

    // MSJ: Buy insurance
    await config.flightSuretyApp.buyInsurance(flight, airline,timestamp, {from: passenger, value: insuranceFee, gasPrice: 0})

    // MSJ: Check if passenger is insured
    let passengerInsured = await config.flightSuretyData.isInsured(passenger, airline, flight, timestamp);

    // MSJ: Assert
    assert.equal(passengerInsured, true, "passenger is insured after purchasing insurnace");
  });

  it('Test oracles get registered', async () => {
    // MSJ: Get fee
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();
    
    // MSJ: Loop to register 20 Oracles
    for(let a = 1; a < 20; a++) 
    {      
      await config.flightSuretyApp.registerOracle({from: accounts[a], value: fee});
      let result = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
    }
  });

  it('Test oracles can request flight status', async () => {
    // MSJ: Set up constants
    const AIRLINE_FUNDING_VALUE = web3.utils.toWei("10", "ether");
    const PASSENGER_INSURANCE_VALUE_1 = web3.utils.toWei("1", "ether");
    const PASSENGER_INSURANCE_VALUE_2 = web3.utils.toWei("0.5", "ether");
    const TIMESTAMP = Math.floor(Date.now() / 1000);
    const STATUS_CODE_LATE_AIRLINE = 20;
    const TEST_ORACLES_COUNT = 20;
    const ORACLES_OFFSET = 20;

    // MSJ: Set up airlines
    let airline1 = accounts[2];
    let airline2 = accounts[3];
    let airline3 = accounts[4];
    let airline4 = accounts[5];
  
    // MSJ: Set up Flights
    let flight1 = {
      airline: airline1,
      flight: "Air Udacity", 
      timestamp: TIMESTAMP
    }
    let flight2 = {
      airline: airline1,
      flight: "Udacity Airlines", 
      timestamp: TIMESTAMP
    }
    let flight3 = {
      airline: airline2,
      flight: "Space Udacity", 
      timestamp: TIMESTAMP
    }
    let flight4 = {
      airline: airline3,
      flight: "Udacity X",
      timestamp: TIMESTAMP
    } 

    // MSJ: Set up Passengers
    let passenger1 = accounts[10];
    let passenger2 = accounts[11];
  
    let airline = flight2.airline;
    let flight = flight2.flight;
    let timestamp = flight2.timestamp;

    // MSJ: Fetch flight status
    await config.flightSuretyApp.fetchFlightStatus(airline, flight, timestamp);

    for(let a = 1; a < 20; a++) {
      // MSJ: Get oracle info
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
      for(let i = 0; i < 3; i++) {
        try {
          await config.flightSuretyApp.submitOracleResponse(oracleIndexes[i], airline, flight, timestamp, STATUS_CODE_LATE_AIRLINE, {from: accounts[a]});
        }
        catch(e) {
          // Enable during debugging
          // console.log('\nError', idx, oracleIndexes[i].toNumber(), flight, timestamp);
        }
      }
    }

  });

  it('Test that payout is 1.5x the amount that was insured', async () => {
    // MSJ: Set up
    let passenger = accounts[6];    
    let flight = "Air Udacity"; 
    let airline = accounts[3];
    let timestamp = 20200703;
    const insuranceFee = web3.utils.toWei("1", "ether");

    // MSJ: Buy insurance
    await config.flightSuretyApp.buyInsurance(flight, airline,timestamp, {from: passenger, value: insuranceFee, gasPrice: 0})

    // MSJ: Check if passenger is insured
    let passengerInsured = await config.flightSuretyData.isInsured(passenger, airline, flight, timestamp);

    // MSJ: Get FlightKey
    flightKey = await config.flightSuretyData._getFlightKey(airline, flight, timestamp)

    // MSJ: Simulate a flight status change to a late due to airline (StatusCode: 20)
    await config.flightSuretyData.updateFlightStatusCode(flightKey, 20)

    // MSJ: Confirm status code
    let newStatusCode = await config.flightSuretyData.getFlightStatusCode(flightKey)
    newStatusCode = Number(newStatusCode);

    // MSJ: Process flight status (StatusCode: 20)
    await config.flightSuretyApp.processFlightStatus(airline, flight, timestamp, newStatusCode, {from: config.owner})

    // MSJ: Amount owned to insuredPassenger
    let amountOwed = insuranceFee * 1.5;
    // console.log('amountOwed:' + amountOwed);

    // MSJ: Get pending payments
    let pendingPayment = await config.flightSuretyData.getPendingPayment(passenger)
    pendingPaymentAmount = Number(pendingPayment);
    // console.log('Pending Payment:' + pendingPaymentAmount);

    // MSJ: Test payment / withdraw; Passenger has to go through pay process before receiving funds
    try 
    {
      await config.flightSuretyApp.pay({from: passenger, gasPrice: 0});
    } 
    catch (e) 
    {
      console.log(e);
    }

    // MSJ: Assert: Amount Owned = PendingPayment
    assert.equal(amountOwed, pendingPayment, "Amount incorrect");

  });
});
