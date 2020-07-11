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

// MSJ: Status codes
const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;
const STATUS_CODE_ARR  = [STATUS_CODE_UNKNOWN, STATUS_CODE_ON_TIME, STATUS_CODE_LATE_AIRLINE, STATUS_CODE_LATE_WEATHER, STATUS_CODE_LATE_TECHNICAL, STATUS_CODE_LATE_OTHER];

// MSJ: Get random status code
function getRandomStatusCode(statusCodeArr) {
  var currIdx = statusCodeArr.length, temp, index;

  while (currIdx > 0) 
  {
      index = Math.floor(Math.random() * currIdx);
      currIdx--;
      temp = statusCodeArr[currIdx];
      statusCodeArr[currIdx] = statusCodeArr[index];
      statusCodeArr[index] = temp;
  }
  return statusCodeArr[0];

}

// MSJ: Authorize FlightSuretyApp contract and register oracles
let oracles = [];

web3.eth.getAccounts().then((accounts) => { 
  console.log("FlightSuretyData: ", config.dataAddress);
  flightSuretyData.methods.authorizeCaller(config.appAddress)
     .send({from: accounts[0]})
     .then(result => {
      console.log("FlightSuretyApp authorized: ", config.appAddress);
    })
    .catch(error => {
      console.log(error);
    });
     flightSuretyApp.methods.REGISTRATION_FEE().call().then(fee => {
      for(let a = 1; a < 20; a++) {
        flightSuretyApp.methods.registerOracle()
        .send({ from: accounts[a], value: fee,gas:4000000 })
        .then(result=>{
          flightSuretyApp.methods.getMyIndexes().call({from: accounts[a]})
          .then(indices =>{
            oracles[accounts[a]] = indices;
            console.log("Oracle: " + accounts[a]);
          })
        }) 
        .catch(error => {
          console.log("Error: " + accounts[a] + error);
        });           
      }
     })
});

// MSJ: Oracle Request Event + SubmitOracleResponse
flightSuretyApp.events.OracleRequest({fromBlock: 0}, function (error, event) {
  if (error) {
    console.log(error);
  }
  else {
    let statusCode = getRandomStatusCode();
    let index = event.returnValues.index;
    let airline = event.returnValues.airline;
    let flight = event.returnValues.flight;
    let timestamp = event.returnValues.timestamp;

    for(let a = 0; a < oracles.length; a++) {
      if(oracles[a].index.includes(index)) {
        flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, statusCode).send({from: oracles[a].address}, (error, result) => {
          if(error) {
            console.log("Error: " + oracles[a] + error);
          } 
          else {
            console.log("Oracle: " + oracles[a] + statusCode);
          }
        });
      }
    }
  }
});

// MSJ: Flight Status Info Event
flightSuretyApp.events.FlightStatusInfo({
  fromBlock: 0
}, function (error, event) {
  if (error) {
    console.log(error)
  }
  else {
    console.log("FlightstatusInfo:  " + event);
    }
  }
);



const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;