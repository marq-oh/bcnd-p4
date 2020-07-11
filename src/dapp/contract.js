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

  registerAirline(airline) {
    let self = this;
    let payload = {
      airline: airline
    }
    
    self.flightSuretyApp.methods.registerAirline(airline).send({from: self.owner}, (error, result) => {
      if(error) {
        console.log(error);
      } 
      else {
        alert('Registered: ' + payload.airline);
        console.log('Registered: ' + payload.airline);
        console.log(payload);
      }    
    });
  }
  
  submitFunding(airline, funds) {
    let self = this;
    const regFunds = self.web3.utils.toWei(funds, "ether"); 

    let fundedAirline = self.flightSuretyApp.methods.submitFunding().send({from: airline, value: regFunds, gas: 1000000}, (error, result) => {
      if(error) {
        alert(error);
        console.log(error);
      } 
      else {
        alert('Funded Airline: ' + airline);
        console.log('Funded Airline: ' + airline);

      }    
    });

  } 

  getContractBalance(callback) {
    let self = this;
    let contractBalance = self.flightSuretyData.methods.getContractBalance().call({from: self.owner}, callback);
    console.log('Contract Balance: ' + contractBalance);
    return contractBalance;
  }

  getPendingPayment(passenger, callback) {
    let self = this;
    alert(passenger);
    let pendingPaymentsData = self.flightSuretyData.methods.getPendingPayment(passenger).call({from: passenger, gas: 1000000}, callback);
    console.log('Pending Payments: ' + pendingPaymentsData);
    return pendingPaymentsData;
  }

  getRegisteredFunded(callback) {
    let self = this;
    let registeredFunded = self.flightSuretyData.methods.getAirlinesRegisteredFunded().call({from: self.owner}, callback);
    console.log('Registered + Funded: ' + registeredFunded);
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

  purchaseFlightInsurance(flight, airline, timestamp, amount, passenger, callback) {
    let self = this;
    let payload = {
      flight: flight,
      airline: airline,
      timestamp: timestamp,
      amount: amount,
      passenger: passenger
    }

    const insuranceFee = self.web3.utils.toWei(amount, "ether"); 

    let purchasedInsurance = self.flightSuretyApp.methods.purchaseFlightInsurance(payload.flight, payload.airline, payload.timestamp).send({from: payload.passenger, value: insuranceFee, gas: 1000000}, (error, result) => {
      if(error) {
        alert(error);
        console.log(error);
      } 
      else {
        alert('Insurance Purchased: ' + payload.flight + " | " + payload.airline + " | " + payload.timestamp + " | " + payload.amount + " | " + payload.passenger);
        console.log("Insurance Purchased: " + payload.flight + " | " + payload.airline + " | " + payload.timestamp + " | " + payload.amount + " | " + payload.passenger);
        console.log(payload);
        
      }    
    });
  }

  testProcessFlightStatus(flight, airline, timestamp, callback) {
    let self = this;
    let payload = {
      flight: flight,
      airline: airline,
      timestamp: timestamp
    }

    let processedFlightStatus = self.flightSuretyApp.methods.processFlightStatus(payload.airline, payload.flight, payload.timestamp, 20).send({from: self.owner, gas: 1000000}, (error, result) => {
      if(error) {
        alert(error);
        console.log(error);
      } 
      else {
        alert('Test Process Flight Status succeeded');
        console.log('Test Process Flight Status succeeded');
        
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
  
  withdraw(passenger, callback) {
    let self = this;
    self.flightSuretyApp.methods.withdrawFunds().send({from: passenger, gas: 1000000}, (error, result) => {
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