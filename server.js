
"use strict";
var firebase = require('firebase');
var firebase = require('firebase/app');
var current = []
require('firebase/database');

require("dotenv").config();
const express = require("express");
const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const { abi, bytecode } = require("./compile");

// load required environment variables
const env = process.env.NODE_ENV;
const mnemonic = process.env.MNEMONIC;
const URL = process.env.URL;

// start the express server
const app = express();
const port = process.env.PORT || 5000;

// body-parser: middleware for parsing HTTP JSON body into a usable object
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// cors
const cors = require("cors");
if (env !== "production") {
  app.use(cors());
}



// Set the configuration for the voting system app
var config = {
  apiKey: "AIzaSyCrn5VNo0R6OjKqDQ2UtYpqSgJjLuAd6Lo",
  authDomain: "dsc-blockchain-voting-system.firebaseapp.com",
  databaseURL: "https://dsc-blockchain-voting-system-default-rtdb.firebaseio.com/",
  projectId: "dsc-blockchain-voting-system",
  storageBucket: "dsc-blockchain-voting-system.appspot.com",
  messagingSenderId: "150101738021",
  appId: "1:150101738021:web:9253084d5aaaf4f69ff5cc",
  measurementId: "G-H6DPGQJXZH"
};
firebase.initializeApp(config);
// Get a reference to the database service
var database = firebase.database();

// Helper to write election with the given name and ID    to the firebase
// P.S should we also store an authentication method? ie: email

function writeElectionData(electionName, electionID, electionAddress, startTime, endTime) {
  firebase.database().ref('elections/' + electionID).set({
    electionName: electionName,
    electionID: electionID,
    electionAddress: electionAddress,
    startTime: startTime,
    endTime: endTime
  });
} 

// returns an array of currently occuring elections
function currentElections(){
  // current epoch time
  var currentElectionTime = Math.floor(new Date().getTime()/1000.0)
  var AllElections = []
  var currentElection = []
  var times;
  let electionRefer = database.ref('elections/');

  electionRefer.on('value', (snapshot) => {   
    let temp = snapshotToArray(snapshot, AllElections)
    for(var i = 0; i < temp.length; i++){
      times = getElectionTimes(temp[i].electionID)
      times.sort()
      if((times[0] <= currentElectionTime) && (currentElectionTime <= times[1])){
        currentElection.push(temp[i])
      }
    }

  });
  return currentElection
}

// creates an array from a snapshot in firebase
function snapshotToArray(snapshot, arr) {

  snapshot.forEach(function(childSnapshot) {
      var item = childSnapshot.val()
      item.key = childSnapshot.key

      arr.push(item);
  });
  return arr
};

// updates election start time
function editElectionStartTime(electionID, newStartTime){
  var updates = {}
  updates['elections/' + electionID + '/startTime'] = newStartTime
  return firebase.database().ref().update(updates);
}

// updates elections end time
function editElectionEndTime(electionID, newEndTime){
  var updates = {}
  updates['elections/' + electionID + '/endTime'] = newEndTime
  return firebase.database().ref().update(updates);
}

// Returns an array witht he start and the end date of the election
function getElectionTimes(electionID){
  var times = []

  var electionRef = database.ref('elections/' + electionID + '/startTime');
  electionRef.on('value', (snapshot) => {  
  var val = snapshot.val()
  times.push(val)
  });

  var electionRef = database.ref('elections/' + electionID + '/endTime');
  electionRef.on('value', (snapshot) => {  
  times.push(snapshot.val())
  });
return times
}

// returns elections address
function getElectionAddress(electionID){
  var address
  var electionRef = database.ref('elections/' + electionID + '/electionAddress');
  electionRef.on('value', (snapshot) => {  
  address = snapshot.val();
});
return address
}

function testFirebase(){
  var time = Math.floor(new Date().getTime()/1000.0)
  var name = "TestElection"
  var id = 1
  var address = "sdfh98waehfaiu"
  var newStartTime = -100
  var newEndTime = -1
  writeElectionData(name, id, address, 0, 5*time)
  var curr = currentElections()
  setTimeout(() => { console.log(curr); }, 10000);
}
function testreadwrite(){
  var time = Math.floor(new Date().getTime()/1000.0)
  var name = "TestElection"
  var id = 1
  var address = "sdfh98waehfaiu"
  var newStartTime = -100
  var newEndTime = -1
  writeElectionData(name, id, address, 69, 420)
  var y = getElectionAddress(id)
  if(y != address){
    console.log("wrong address")
    console.log("address is " + y)
  }
  editElectionStartTime(id, newStartTime)
  editElectionEndTime(id, newEndTime)
  var times = getElectionTimes(id)
  if (!(times.includes(newStartTime) && times.includes(newEndTime))){
    console.log("incorrect times retrieved")
  }
}
testFirebase()


const electionStorage = {}; // TODO: use firebase
const electionAddress = []; // TODO use firebase

//helper functions
const voterData = async (voterAccount, address) => {
  const provider = new HDWalletProvider({
    mnemonic: mnemonic,
    providerOrUrl: URL,
    addressIndex: voterAccount,
    numberOfAddresses: 1,
  });
  const web3 = new Web3(provider);
  const contract = await new web3.eth.Contract(abi, address);
  const result = await contract.methods.voters(provider.getAddress(0)).call();
  provider.engine.stop();
  return result;
};

//middleware
const OrganizerContract = (req, res, next) => {
  const organizerAccount = req.body.organizerAccount;
  try {
    if (electionStorage.hasOwnProperty(organizerAccount)) {
      return next();
    } else {
      res.status(401).send("Election contract does not exist");
      return;
    }
  } catch (error) {
    res.status(501).send("Server error");
  }
};

// if the voter has voted then return the candidate id. If not then return false
// TODO verify voter has logged in
app.get("/voter/elections/:electionID/", async (req, res) => {
  const { voterAccount } = req.body;
  try {
    const result = await voterData(
      voterAccount,
      electionAddress[req.params.electionID]
    );
    const response = { result: false };
    if (result.voted && result.validVoter) {
      response.result = result.votedFor;
    }
    res.send(response);
  } catch (error) {
    console.log(error);
    res.status(401).send("Bad request");
  }
});

// check voter eligibility
// TODO ensure that the voter is logged in
app.get("/voter/elections/:electionID/verify", async (req, res) => {
  const { voterAccount } = req.body;
  try {
    const result = await voterData(
      voterAccount,
      electionAddress[req.params.electionID]
    );
    const response = { result: result.validVoter };
    res.send(response);
  } catch (error) {
    console.log(error);
    res.status(401).send("Bad request");
  }
});

// casting vote
// TODO verify the voter has logged in
app.post("/voter/elections/:electionID/vote", async (req, res) => {
  const { voterAccount, candidateID } = req.body;
  try {
    const provider = new HDWalletProvider({
      mnemonic: mnemonic,
      providerOrUrl: URL,
      addressIndex: voterAccount,
      numberOfAddresses: 1,
    });
    const web3 = new Web3(provider);
    const contract = await new web3.eth.Contract(
      abi,
      electionAddress[req.params.electionID]
    );
    await contract.methods
      .vote(candidateID)
      .send({ from: provider.getAddress(0) });
    const result = await contract.methods.candidates(candidateID).call();
    console.log(result);
    res.send("Voted casted");
    provider.engine.stop();
  } catch (error) {
    let response = "Bad request";
    const msg = error.message;
    if (msg.includes("Has no right to vote")) {
      response = "Not a valid voter";
    } else if (msg.includes("Already voted")) {
      response = "Vote has already been cast";
    }
    res.status(401).send(response);
  }
});

// add eligible voters
// TODO ensure that organizer is logged in
app.post(
  "/organizer/elections/:electionID/validate",
  OrganizerContract,
  async (req, res) => {
    const { organizerAccount, voterAccounts } = req.body;
    try {
      const provider = new HDWalletProvider({
        mnemonic: mnemonic,
        providerOrUrl: URL,
        addressIndex: organizerAccount,
        numberOfAddresses: 1,
      });
      const web3 = new Web3(provider);
      const contract = await new web3.eth.Contract(
        abi,
        electionAddress[req.params.electionID]
      );
      const result = {};
      for (let address of voterAccounts) {
        let voterProvider = new HDWalletProvider({
          mnemonic: mnemonic,
          providerOrUrl: URL,
          addressIndex: address,
          numberOfAddresses: 1,
        });
        await contract.methods
          .giveRightToVote(voterProvider.getAddress(0))
          .send({ from: provider.getAddress(0) })
          .then((result[address] = true));
        voterProvider.engine.stop();
      }
      provider.engine.stop();
      res.send(result);
    } catch (error) {
      console.log(error);
      res.status(401).send("Bad request");
    }
  }
);

// starting election endpoint
// TODO middleware to verify organizer account
app.post("/organizer/elections/start", async (req, res) => {
  const { organizerAccount, candidates, endTime, startTime } = req.body;
  try {
    const provider = new HDWalletProvider({
      mnemonic: mnemonic,
      providerOrUrl: URL,
      addressIndex: organizerAccount,
      numberOfAddresses: 1,
    });
    const web3 = new Web3(provider);
    const contract = await new web3.eth.Contract(abi);
    const deployTx = await contract
      .deploy({
        data: "0x" + bytecode,
        arguments: [candidates, endTime, startTime],
      })
      .send({ from: provider.getAddress(0), gas: 3000000 });

    console.log("Deployed election at " + deployTx.options.address);
    electionAddress.push(deployTx.options.address);
    if (!electionStorage.hasOwnProperty(organizerAccount)) {
      electionStorage[organizerAccount] = [];
    }
    electionStorage[organizerAccount].push(
      electionAddress.indexOf(deployTx.options.address)
    );

    provider.engine.stop();

    res.send({
      contract_address: {
        electionID: electionAddress.indexOf(deployTx.options.address),
        electionAddress: deployTx.options.address,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(400).send("Invalid request");
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});

//----------------------------------------------------------------------------------------------------------------------------------------------------
// add candidate to given election
// TODO middleware to verify organizer account

app.post("organizer/elections/:electionID/addCandidate", async (req, res) => {
  const { organizerAccount, candidateName } = req.body;
  try {
    const provider = new HDWalletProvider({
      mnemonic: mnemonic,
      providerOrUrl: URL,
      addressIndex: organizerAccount,
      numberOfAddresses: 1,
    });
    const web3 = new Web3(provider);
    const contract = await new web3.eth.Contract(
      abi,
      electionAddress[req.params.electionID]
    );
    await contract.methods
      .addCandidate(candidateName)
      .send({ from: provider.getAddress(0) });

    console.log(result);
    res.send("Candidate added");
    provider.engine.stop();
  } catch (error) {
    let response = "Bad request";
    const msg = error.message;
    if (msg.includes("Election start time has passed")) {
      response = "Election start time has passed";
    } 
    res.status(401).send(response);
  }
});

// remove candidate to given election
// TODO middleware to verify organizer account

app.post("organizer/elections/:electionID/removeCandidate", async (req, res) => {
  const { organizerAccount, candidateID } = req.body;
  try {
    const provider = new HDWalletProvider({
      mnemonic: mnemonic,
      providerOrUrl: URL,
      addressIndex: organizerAccount,
      numberOfAddresses: 1,
    });
    const web3 = new Web3(provider);
    const contract = await new web3.eth.Contract(
      abi,
      electionAddress[req.params.electionID]
    );
    await contract.methods
      .removeCandidate(candidateID)
      .send({ from: provider.getAddress(0) });

    console.log("Candidate removed");
    res.send("Candidate removed");
    provider.engine.stop();
  } catch (error) {
    let response = "Bad request";
    const msg = error.message;
    if (msg.includes("Election start time has passed")) {
      response = "Election start time has passed";
    } 
    res.status(401).send(response);
  }
});


// returns array of candidate(s) name(s) for the given election
// TODO middleware to verify organizer account

app.post("organizer/elections/:electionID/winner", async (req, res) => {
  const { organizerAccount, candidateID } = req.body;
  try {
    const provider = new HDWalletProvider({
      mnemonic: mnemonic,
      providerOrUrl: URL,
      addressIndex: organizerAccount,
      numberOfAddresses: 1,
    });
    const web3 = new Web3(provider);
    const contract = await new web3.eth.Contract(
      abi,
      electionAddress[req.params.electionID]
    );
    result = await contract.methods
      .calculateWinnerName()
      .send({ from: provider.getAddress(0) });

    console.log(result);
    res.send(result);
    provider.engine.stop();
  } catch (error) {
    let response = "Bad request";
    const msg = error.message;
    if (msg.includes("Election end time has not passed")) {
      response = "Election end time has not passed";
    } 
    res.status(401).send(response);
  }
});
