exports.id=0,exports.modules={"./src/server/server.js":function(e,o,t){"use strict";t.r(o);var s=t("./build/contracts/FlightSuretyApp.json"),n=t("./build/contracts/FlightSuretyData.json"),r=t("./src/server/config.json"),a=t("web3"),c=t.n(a),l=t("express"),i=t.n(l),u=r.localhost,d=new c.a(new c.a.providers.WebsocketProvider(u.url.replace("http","ws")));d.eth.defaultAccount=d.eth.accounts[0];var f=new d.eth.Contract(s.abi,u.appAddress),g=new d.eth.Contract(n.abi,u.dataAddress),h=[],p=[0,10,20,30,40,50];d.eth.getAccounts((function(e,o){var t=o[0];g.methods.authorizeCaller(u.appAddress).send({from:t},(function(e,o){e?console.log(e):console.log("Configured authorized caller: ".concat(u.appAddress))}));for(var s=function(e){f.methods.registerOracle().send({from:o[e],value:d.utils.toWei("1","ether"),gas:3e6},(function(t,s){t?console.log(t):f.methods.getMyIndexes().call({from:o[e]},(function(t,s){if(t)console.log(t);else{var n={address:o[e],index:s};console.log("Oracle: ".concat(JSON.stringify(n))),h.push(n)}}))}))},n=20;n<40;n++)s(n)})),f.events.OracleRequest({fromBlock:0},(function(e,o){e?console.log(e):function(){for(var e=o.returnValues.index,t=o.returnValues.airline,s=o.returnValues.flight,n=o.returnValues.timestamp,r=p[Math.floor(Math.random()*p.length)],a=function(o){h[o].index.includes(e)&&f.methods.submitOracleResponse(e,t,s,n,r).send({from:h[o].address},(function(e,t){e?console.log(e):console.log("".concat(JSON.stringify(h[o]),": Status code ").concat(r))}))},c=0;c<h.length;c++)a(c)}()}));var m=i()();m.get("/api",(function(e,o){o.send({message:"An API for use with your Dapp!"})})),o.default=m}};