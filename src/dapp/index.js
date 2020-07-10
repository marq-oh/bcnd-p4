
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;
    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        // Get Registered + Funded Airlines
        let list = contract.getRegisteredFunded((error, result) => {
            console.log(error,result);
        })
        .then((list) => {
            DOM.elid('get-registered-funded-address').value = list;
        });
        
        // Pre-register Flights and add to Purchase Insurance dropdown
        let start = new Date();
        let end = new Date(2022, 12, 31);

        let timestamp1 = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
        timestamp1 = Number(timestamp1);

        let timestamp2 = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
        timestamp2 = Number(timestamp2);
        
        let timestamp3 = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
        timestamp3 = Number(timestamp3);

        let preRegisteredFlights = ['SFO-YVR|' + timestamp1, 'LAX-JFK|' + timestamp2, 'BWN-CGK|' + timestamp3];
        let flight;

        for (flight of preRegisteredFlights){
            let splitFlightDetails = flight.split('|');
            let flightCode = splitFlightDetails[0];
            let timestamp = splitFlightDetails[1];

            let registeredFlight = contract.initialFlightsRegister(flightCode, timestamp, contract.owner, (error, result) => {
                console.log(error,result);
            })
            .then((registeredFlight) => {
                // Populate dropdowns
                let flightDropDown = DOM.elid('purchase-flight-insurance-dropdown');
                var option = document.createElement('option');
                option.text = contract.owner + ' | ' + flightCode + ' | ' + timestamp;
                option.value = contract.owner + '|' + flightCode + '|' + timestamp;
                flightDropDown.add(option, 0);

                let flightDropDown2 = DOM.elid('flight-status-update-dropdown');
                var option2 = document.createElement('option');
                option2.text = contract.owner + ' | ' + flightCode + ' | ' + timestamp;
                option2.value = contract.owner + '|' + flightCode + '|' + timestamp;
                flightDropDown2.add(option2, 0);
            });
        }

        // Authorize Caller
        DOM.elid('authorize-caller-btn').addEventListener('click', () => {
            let appContract = DOM.elid('authorize-caller-address').value;
            // Write transaction
            contract.authorizeCaller(appContract, (error, result) => {
                console.log(error,result);
            });
        })

        // Purchase Insurance
        DOM.elid('purchase-flight-insurance-btn').addEventListener('click', () => {
            let selectFlightDropDown = DOM.elid('purchase-flight-insurance-dropdown');
            var selectedFlight = selectFlightDropDown.options[selectFlightDropDown.selectedIndex].value;

            let selectedFlightSplit = selectedFlight.split('|');
            let airlineIns = selectedFlightSplit[0];
            let flightCodeIns = selectedFlightSplit[1];
            let timestampIns = selectedFlightSplit[2];

            var submittedEther = DOM.elid('purchase-flight-funds').value;

            // Write transaction
            contract.purchaseFlightInsurance(flightCodeIns, airlineIns, timestampIns, submittedEther, (error, result) => {
                console.log(error,result);
            });
        })

        // Fetch Flight Status
        DOM.elid('flight-status-update-btn').addEventListener('click', () => {
            let selectFlightDropDown2 = DOM.elid('flight-status-update-dropdown');
            var selectedFlight2 = selectFlightDropDown2.options[selectFlightDropDown2.selectedIndex].value;
            let selectedFlightSplit2 = selectedFlight2.split('|');
            let airlineFltSts = selectedFlightSplit2[0];
            let flightCodeFltSts = selectedFlightSplit2[1];
            let timestampFltSts = selectedFlightSplit2[2];
            // Write transaction
            contract.fetchFlightStatus(airlineFltSts, flightCodeFltSts, timestampFltSts, (error, result) => {
                console.log(error,result);
            });
        })
    });
    

})();

function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







