import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
  constructor(network, callback) {
    let config = Config[network];
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
    this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
    this.initialize(callback);
    this.owner = null;
    this.airlines = [];
    this.passengers = [];
  }

  initialize(callback) {
    this.web3.eth.getAccounts((error, accts) => {
      this.owner = accts[0];
      let counter = 1;
      
      while(this.airlines.length < 5) {
        this.airlines.push(accts[counter++]);
      }

      while(this.passengers.length < 5) {
        this.passengers.push(accts[counter++]);
      }

      callback();
    });
  }

  isOperational(callback) {
    let self = this;
    self.flightSuretyApp.methods.isOperational().call({ from: self.owner}, callback);
  }

  authorizeCaller(appContract) {
    
    let self = this;
    let payload = {
      appContract: appContract
    }
    
    self.flightSuretyData.methods.authorizeCaller(payload.appContract).send({from: self.owner}, (error, result) => {
      if(error) {
        console.log(error);
      } 
      else {
        console.log("Configured authorized caller: " + payload.appContract);
        console.log(payload);
      }    
    });
  }

  registerFlight(flight, timestamp, callback) {
    
    let self = this;
    let payload = {
      flight: flight,
      timestamp: timestamp
    }
    alert(payload.flight);
    alert(payload.timestamp);
    alert(self.owner);
    self.flightSuretyApp.methods.registerFlight(payload.flight, payload.timestamp).send({from: self.owner}, (error, result) => {
      if(error) {
        console.log(error);
      } 
      else {
        console.log("Flight: " + payload.flight);
        console.log("Timestamp: " + payload.timestamp);
        console.log(payload);
      }      
    });
  }

  fetchFlightStatus(flight, airline, timestamp, callback) {
    let self = this;
    let payload = {
      airline: airline,
      flight: flight,
      timestamp: timestamp
    }
    
    self.flightSuretyApp.methods.fetchFlightStatus(payload.airline, payload.flight, payload.timestamp).send({from: self.owner}, (error, result) => {
      if(error) {
        console.log(error);
      } 
      else {
        console.log(payload);
      }      
    });
  }

  /*fetchFlightStatus(flight, airline, timestamp, callback) {
    let self = this;
    let payload = {
      airline: self.airlines[0],
      flight: flight,
      timestamp: Math.floor(Date.now() / 1000)
    }
    
    self.flightSuretyApp.methods.fetchFlightStatus(payload.airline, payload.flight, payload.timestamp).send({from: self.owner}, (error, result) => {
      callback(error, payload);
    });
  }*/

  purchaseFlightInsurance(flight, airline, timestamp, callback) {
    let self = this;
    let payload = {
      airline: airline,
      flight: flight,
      timestamp: timestamp
    }
    
    self.flightSuretyApp.methods.purchaseFlightInsurance(payload.flight, payload.airline, payload.timestamp).send({from: self.owner}, (error, result) => {
      if(error) {
        console.log(error);
      } 
      else {
        console.log("Flight: " + payload.airline);
        console.log("Flight: " + payload.flight);
        console.log("Timestamp: " + payload.timestamp);
        console.log(payload);
      }      
    });
  }
}