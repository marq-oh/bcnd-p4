exports.id=0,exports.modules={"./src/server/server.js":function(e,t,n){"use strict";n.r(t);var s=n("./build/contracts/FlightSuretyApp.json"),r=n("./src/server/config.json"),o=n("web3"),c=n.n(o),a=n("express"),u=n.n(a),l=r.localhost,i=new c.a(new c.a.providers.WebsocketProvider(l.url.replace("http","ws")));i.eth.defaultAccount=i.eth.accounts[0];var d=new i.eth.Contract(s.abi,l.appAddress),f=[],p=[0,10,20,30,40,50];i.eth.getAccounts((function(e,t){t[0]})),d.events.OracleRequest({fromBlock:0},(function(e,t){e?console.log(e):function(){for(var e=t.returnValues.index,n=t.returnValues.airline,s=t.returnValues.flight,r=t.returnValues.timestamp,o=p[Math.floor(Math.random()*p.length)],c=function(t){f[t].index.includes(e)&&d.methods.submitOracleResponse(e,n,s,r,o).send({from:f[t].address},(function(e,n){e?console.log(e):console.log("".concat(JSON.stringify(f[t]),": Status code ").concat(o))}))},a=0;a<f.length;a++)c(a)}()}));var h=u()();h.get("/api",(function(e,t){t.send({message:"An API for use with your Dapp!"})})),t.default=h}};