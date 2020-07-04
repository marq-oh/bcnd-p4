import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

// MSJ: For Oracles
const ORACLES_COUNT = 20;
let oracles = [];

// MSJ: Status codes
const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;
const STATUS_CODES  = [
  STATUS_CODE_UNKNOWN,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_WEATHER,
  STATUS_CODE_LATE_TECHNICAL,
  STATUS_CODE_LATE_OTHER
];

// MSJ: Get random status code
function getRandomStatusCode() {
  return STATUS_CODES[Math.floor(Math.random() * STATUS_CODES.length)];
}

// MSJ: To register Oracles
web3.eth.getAccounts((error, accounts) => {
  let owner = accounts[0];

  // MSJ: Authorize app contract
  flightSuretyData.methods.authorizeCaller(config.appAddress).send({from: owner}, (error, result) => {
    if(error) 
    {
      console.log(error);
    } 
    else {
      console.log(`Configured authorized caller: ${config.appAddress}`);
    }
  });

  // MSJ: Oracle Registration
  let fee = flightSuretyApp.methods.REGISTRATION_FEE().call({from: owner});

  for(let a=0; a<ORACLES_COUNT; a++) 
  {
    flightSuretyApp.methods.registerOracle().send({from: accounts[a], value: fee, gas: 3000000}, (error, result) => {
      if(error) 
      {
        console.log(error);
      }
      else 
      {
        flightSuretyApp.methods.getMyIndexes().call({from: accounts[a]}, (error, result) => {
          if (error) {
            console.log(error);
          }
          else {
            let oracle = {address: accounts[a], index: result};
            console.log(`Oracle: ${JSON.stringify(oracle)}`);
            oracles.push(oracle);
          }
        });
      }
    });
  };
});

// MSJ: For Oracle request
flightSuretyApp.events.OracleRequest({fromBlock: 0}, function (error, event) {
  if (error) {
    console.log(error);
  }
  else {
    let index = event.returnValues.index;
    let airline = event.returnValues.airline;
    let flight = event.returnValues.flight;
    let timestamp = event.returnValues.timestamp;
    let statusCode = getRandomStatusCode();

    for(let a=0; a<oracles.length; a++) {
      if(oracles[a].index.includes(index)) {
        flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, statusCode).send({from: oracles[a].address}, (error, result) => {
          if(error) {
            console.log(error);
          } 
          else {
            console.log(`${JSON.stringify(oracles[a])}: Status code ${statusCode}`);
          }
        });
      }
    }
  }
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


