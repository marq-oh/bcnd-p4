
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

        // Authorize Caller
        DOM.elid('authorize-caller-btn').addEventListener('click', () => {
            let appContract = DOM.elid('appContract').value;

            // Write transaction
            contract.authorizeCaller(appContract, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Authorize Caller Status', error: error, value: result.appContract + ' ' + result.timestamp} ]);
            });
        })

        // Register Flight
        DOM.elid('register-flight-status-btn').addEventListener('click', () => {
            let flight1 = DOM.elid('flight1').value;
            let timestamp1 = DOM.elid('timestamp1').value;
            
            // Write transaction
            contract.registerFlight(flight1, timestamp1, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Register Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        // Fetch Flight Status
        DOM.elid('fetch-flight-status-btn').addEventListener('click', () => {
            let flight2 = DOM.elid('flight2').value;
            let airline2 = DOM.elid('airline2').value;
            let timestamp2 = DOM.elid('timestamp2').value;

            // Write transaction
            contract.fetchFlightStatus(flight2, airline2, timestamp2, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        // Purchase Insurance
        DOM.elid('purchase-insurance-btn').addEventListener('click', () => {
            let flight3 = DOM.elid('flight3').value;
            let airline3 = DOM.elid('airline3').value;
            let timestamp3 = DOM.elid('timestamp3').value;

            // Write transaction
            contract.purchaseFlightInsurance(flight3, airline3, timestamp3, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Purchase Insurance Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
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







