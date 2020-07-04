
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

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

    let result = false;

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

});
