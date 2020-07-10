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
    
    let operationalStatus = self.flightSuretyApp.methods.isOperational().call({from: self.owner}, callback);
    return operationalStatus;
  }

  
  authorizeCaller(appContract) {
    let self = this;
    let payload = {
      appContract: appContract
    }
    
    self.flightSuretyData.methods.authorizeCaller(config.appAddress).send({from: self.owner}, (error, result) => {
      if(error) {
        console.log(error);
      } 
      else {
        alert('Success: ' + payload.appContract);
        console.log("Configured authorized caller: " + payload.appContract);
        console.log(payload);
      }    
    });
  }
  

  getRegisteredFunded(callback) {
    let self = this;
    let registeredFunded = self.flightSuretyData.methods.getAirlinesRegisteredFunded().call({from: self.owner}, callback);
    return registeredFunded;
  }

  initialFlightsRegister(flight, timestamp, airline, callback) {
    let self = this;
    let payload = {
      flight: flight,
      timestamp: timestamp
    }

    let flightRegistered = self.flightSuretyApp.methods.registerFlight(payload.flight, payload.timestamp).send({from: self.owner, gas: 1000000}, (error, result) => {
      if(error) {
        // alert(error);
        console.log(error);
      } 
      else {
        // alert('Flight Registered: ' + payload.flight + " | " + payload.timestamp);
        console.log("Flight Registered: " + payload.flight + " | " + payload.timestamp);
        console.log(payload);
        
      }    
    });
    return flightRegistered;  
  }

  purchaseFlightInsurance(flight, airline, timestamp, amount, callback) {
    let self = this;
    let payload = {
      flight: flight,
      airline: airline,
      timestamp: timestamp,
      amount: amount
    }

    const insuranceFee = self.web3.utils.toWei(amount, "ether"); 

    let purchasedInsurance = self.flightSuretyApp.methods.purchaseFlightInsurance(payload.flight, payload.airline, payload.timestamp).send({from: self.owner, value: insuranceFee, gas: 1000000}, (error, result) => {
      if(error) {
        alert(error);
        console.log(error);
      } 
      else {
        alert('Insurance Purchased: ' + payload.flight + " | " + payload.airline + " | " + payload.timestamp + " | " + payload.amount);
        console.log("Insurance Purchased: " + payload.flight + " | " + payload.airline + " | " + payload.timestamp + " | " + payload.amount);
        console.log(payload);
        
      }    
    });
  }

  fetchFlightStatus(airline, flight, timestamp, callback) {
    let self = this;
    let payload = {
      airline: airline,
      flight: flight,
      timestamp: timestamp
    }
    
    self.flightSuretyApp.methods.fetchFlightStatus(payload.airline, payload.flight, payload.timestamp).send({from: self.owner, gas: 1000000}, (error, result) => {
      if(error) {
        alert(error);
        console.log(error);
      } 
      else {
        alert('Flight Status Updated');
        console.log(payload);
      }      
    });
  }
  authorizeCaller(appContract) {
    let self = this;
    let payload = {
      appContract: appContract
    }
    
    self.flightSuretyData.methods.authorizeCaller(config.appAddress).send({from: self.owner}, (error, result) => {
      if(error) {
        console.log(error);
      } 
      else {
        alert('Success: ' + payload.appContract);
        console.log("Configured authorized caller: " + payload.appContract);
        console.log(payload);
      }    
    });
  }
  
  withdraw(callback) {
    let self = this;
    self.flightSuretyApp.methods.withdrawFunds().send({from: self.owner}, (error, result) => {
      if(error) {
        console.log(error);
      } 
      else {
        alert('Withdrawal successful');
        console.log('Withdrawal successful');
      }    
    });
  }
}