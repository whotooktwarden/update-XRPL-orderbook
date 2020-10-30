//npm install ripple-lib
const RippleAPI = require('ripple-lib').RippleAPI;

// npm install node-fetch@2.6.0
const fetch = require('node-fetch');

const address = "rG83NMzArGuNPWyVyumuQLkj3EVJsrkDbA";

const secret = '';

const instructions = {maxLedgerVersionOffset: 5};

const https = require('https');

//npm install request request-promise
const request = require("request-promise");

//URL for fetching the XRP/CAD price from CoinGecko
let url = "https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=cad";

const api = new RippleAPI({
  server: 'wss://s1.ripple.com' // Public rippled server hosted by Ripple, Inc.
});
api.on('error', (errorCode, errorMessage) => {
  console.log(errorCode + ': ' + errorMessage);
});
api.on('connected', () => {
  console.log('connected');
});
api.on('disconnected', (code) => {
  // code - [close code](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent) sent by the server
  // will be 1000 if this was normal closure
  console.log('disconnected, code:', code);
});


// Declare functions as async
//Credit to Chris Clark for the cancelall.js code example found in the ripple-lib docs!
async function  cancelOrder(orderSequence) {
  console.log('Cancelling order: ' + orderSequence.toString());
  let prepared = await api.prepareOrderCancellation(address, {orderSequence}, instructions);

  let signing = api.sign(prepared.txJSON, secret);

  try {
    let result = await api.submit(signing.signedTransaction);
  } catch (submitError) {
    console.log("Submit Error");
    console.log(submitError);
  }
}

async function cancelAllOrders(orderSequences) {
  if (orderSequences.length === 0) {
    return Promise.resolve();
  }

  for (let i = 0; i < orderSequences.length; i++) {
    let orderSequence = orderSequences[i];
    await cancelOrder(orderSequence);
  }


}

// begin async code
(async () => {

await api.connect();


let orders = await api.getOrders(address);

let orderSequences = orders.map(order => order.properties.sequence);

await cancelAllOrders(orderSequences);

//fetch the price of XRP from coingecko
var theresponse = await fetch(url);
var thebody = await theresponse.text();

try {
  //let json = JSON.parse(theresponse.body);
  // do something with JSON
  //console.log(thebody);
  //console.log(theresponse.text());
  var searchxrpprice = await new RegExp('[0-9]+\.[0-9]+');
  //console.log('Test regex ${body}:'+searchxrpprice.test(thebody));
  var xrpprice = await searchxrpprice.exec(thebody);
  //console.log("The $xrpprice is: "+xrpprice);
  var thexrpprice = await searchxrpprice.exec(xrpprice[0]);
  console.log("The XRP price in Canadian dollars is: " + thexrpprice[0]);

} catch (jsonError) {
  console.log("coingecko Json Error");
  console.log(jsonError);
}

//Declare the XRP in drops for order creation.  Note that 1000000 drops is 1 XRP.
//This variable is to be a string
var xrppriceindrops = "0";

try {

  let options = {
    'method': 'GET',
    'url': 'https://www.goldapi.io/api/XAG/CAD',
    'headers': {
      'x-access-token': 'GET-YOUR-OWN!',
      'Content-Type': 'application/json'
    }};

  let resp = await request(options);
  //console.log("$resp is: "+resp);
  //if (error) throw new Error(error);
  //Create new variable called data to hold the response's body
  var data = JSON.parse(resp);
  
  //Deprecated code, the goldapi.io API responds with JSON and a 
  //Regular Expression is not necessary!
  //console.log("$data is: "+data);
  //console.log("$data.price is: "+data.price);
  //Regular expression to find the price from the goldapi.io response
  //Find the price data in the form of "price":31.121655
  //var searchcadpriceregex = new RegExp('\"price\":([0-9]+\.[0-9]+)');
  //console.log("Test regex ${data}:"+cadpriceregex.test(data.price));
  //console.log("Past the regex test line.  Onto storing the $data in an array");
  //Store the matched data to an array
  //var searchcadpricearray = searchcadpriceregex.exec(data.price);
  //console.log("$searchcadpricearray[0]: "+searchcadpricearray[0]);
  //Regular expression to find the price of silver in CAD
  //var cadpriceregex = new RegExp('([0-9]+.[0-9]+)');
  //Store the integer as cadprice
  //var cadprice = cadpriceregex.exec(searchcadpricearray[0]);
  
  console.log("The CAD price of silver is: " + data.price);
  //console.log(response.body);

  //Declare a premium to sell your asset, in this case Silver (XAG)
  var premium = Number(5.50);

  var sellingsilverfor = Number(data.price) + premium;

  console.log("Selling silver for: " + sellingsilverfor);

  var xrpxagprice = sellingsilverfor / Number(thexrpprice[0]);
  console.log("The XRP/XAG price is: " + xrpxagprice);

  var trimxrpxagpriceregex = new RegExp('([0-9]+.[0-9]{3})');
  let trimxrpxagprice = trimxrpxagpriceregex.exec(xrpxagprice);
  console.log("The XRP/XAG price to 3 decimal places is: " + trimxrpxagprice[0]);

  //I have hard coded the amount of XAG I am selling to match the order.amount
  //Remember to change this!
  xrppriceindrops = trimxrpxagprice[0] * 1000000 * 15;
  console.log("The price in drops is: " + xrppriceindrops);

} catch (requestError) {
  console.log("Gold api error");
}

var order = {
  "direction": "sell",
  "quantity": {
    "currency": "XAG",
    "counterparty": "rVSB2uzC9cjKfoMQdpQW78qUdSkdHiU4y",
    "value": "15"
  },
  "totalPrice": {
    "currency": "drops",
    "value": String(xrppriceindrops)
  },
  "passive": false,
  "fillOrKill": false
};
  
try {
let prepared = await api.prepareOrder(address, order);
  //console.log(prepared);

let txJSON = prepared.txJSON;
console.log(txJSON);

let signresponse = api.sign(txJSON, secret);
//console.log(signresponse);

var signedtxn = signresponse.signedTransaction;
console.log("The signedTransaction is: "+signedtxn);

//submit the transaction
let submitResp = await api.submit(signedtxn);
console.log(submitResp);

} catch (orderError) {
  console.log("Order Error : ");
  console.log(orderError);
}

console.log('end of script');

async function disconnect () {
    await api.disconnect();
}

disconnect();

})(); // end async code then call it
