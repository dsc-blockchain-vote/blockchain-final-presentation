"use strict";
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const csrf = require("csurf");
const Web3 = require("web3");
const cookieParser = require("cookie-parser");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");
const { abi, bytecode } = require("./compile");
const csrfMiddleWare = csrf({ cookie: true });

// load required environment variables
const env = process.env.NODE_ENV;
const mnemonic = process.env.MNEMONIC;
const URL = process.env.URL;
const databaseURL = process.env.DATABASE;

// initialize firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL,
});

// get reference to firebase database
const db = admin.database();

// start the express server
const app = express();
const port = process.env.PORT || 5000;

// use body-parser, cookieParser and csrfMiddlewares for all end points
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// cors
const cors = require("cors");
if (env !== "production") {
  app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
}

// helper functions
// get voter data from blockchain
const voterData = async (voterAccount, address) => {
  // Get a connection to the voters account on the blockchain
  const provider = new HDWalletProvider({
    mnemonic: mnemonic,
    providerOrUrl: URL,
    addressIndex: voterAccount,
    numberOfAddresses: 1,
  });
  // Get a connection to the network with the provided account number
  const web3 = new Web3(provider);
  // Get a reference to the conract on the network
  const contract = await new web3.eth.Contract(abi, address);
  // Get the voter's information from the network
  const result = await contract.methods.voters(provider.getAddress(0)).call();
  provider.engine.stop();
  return result;
};

// Get user account corresponding to the userID from the firebase database or return null
const userAccount = async (userID) => {
  // Get a reference to the user's data in the database
  const userRef = db.ref("users/" + userID);
  // Get the data from the reference
  const snapshot = await userRef.once("value");
  if (snapshot.val() === null) {
    return null;
  }
  return snapshot.val().account;
};

// Get election data corresponding to the given election, if the user is an organizer, return all election information,
// otherwise return information on the candidates, start and end time, the election's name, and the election organizer's name.
const getElectionData = async (electionID, isOrganizer) => {
  // Get a reference to the election's data in the database
  const electionRef = db.ref("elections/" + electionID);
  // Get the data from the reference
  const snapshot = await electionRef.once("value");
  const data = snapshot.val();
  if (data === null) {
    return null;
  }
  // return all information if the user is an organizer
  if (isOrganizer) {
    return data;
  } else {
    let temp = {
      candidates: data.candidates,
      endTime: epochToHuman(data.endTime),
      startTime: epochToHuman(data.startTime),
      electionName: data.electionName,
      organizerName: data.organizerName,
    };
    // If the election has a reference to a contract on the network, store it
    if (data.hasOwnProperty("address")) {
      temp.address = data.address;
    }
    return temp;
  }
};

// validate the given list of voter ids for the given contract address
// return a list of voter IDs that were invalid
const validateVoters = async (
  validVoters,
  contractAddress,
  organizerAccount
) => {
  // Get a connection to the organizer's account on the blockchain 
  const provider = new HDWalletProvider({
    mnemonic: mnemonic,
    providerOrUrl: URL,
    addressIndex: organizerAccount,
    numberOfAddresses: 1,
  });
  // Get a connection to the network with the provided account number
  const web3 = new Web3(provider);
  
  // Get a connection to the contract on the network
  const deployedContract = await new web3.eth.Contract(abi, contractAddress);
  let invalidVoterIDs = [];
  let validVoterAddresses = [];
  for (let id in validVoters) {
    let voterAccount = await userAccount(validVoters[id]);
    if (voterAccount === null) {
      invalidVoterIDs.push(id);
      continue;
    }
    // Get a connection to the voter's account on the blockchain 
    let voterProvider = new HDWalletProvider({
      mnemonic: mnemonic,
      providerOrUrl: URL,
      addressIndex: voterAccount,
      numberOfAddresses: 1,
    });
    // Push valid voters into validVoterAddresses
    validVoterAddresses.push(voterProvider.getAddress(0));
    voterProvider.engine.stop();
  }
  await deployedContract.methods
    // Give all valid voters the right to vote
    .giveRightToVote(validVoterAddresses)
    .send({ from: provider.getAddress(0) });

  provider.engine.stop();
  return invalidVoterIDs;
};

//convert human readable date and time to epoch time
const humanToEpoch = (date) => {
  let dateObj = new Date(date);
  dateObj.setMilliseconds(0);
  return dateObj.getTime() / 1000;
};

// convert epoch time to human readable date and time
const epochToHuman = (epoch) => {
  let dateObj = new Date(epoch * 1000);
  return dateObj.toISOString();
};

//middlewares

// verify the user has logged in and check if the user is an organizer
const verifyUser = (req, res, next) => {
  // create the session cookie
  const sessionCookie = req.cookies.session || "";
  admin
    .auth()
    .verifySessionCookie(sessionCookie, true)
    .then((decodedClaims) => {
    // process the claim's data
      if (decodedClaims.isOrganizer === true) {
        req.body.isOrganizer = true;
      } else {
        req.body.isOrganizer = false;
      }
      req.body.userID = decodedClaims.uid;
      next();
    })
    .catch((error) => {
      res.clearCookie("session");
      res.status(401).send("Unauthorized");
    });
};

// to create a new election which hasn't been launched.
// stores the required data in database and generates a unique ID for this election
app.post("/api/election/create", verifyUser, async (req, res) => {
  if (!req.body.isOrganizer) {
    res.status(401).send("Unauthorized");
    return;
  }
  const {
    candidates,
    startTime,
    endTime,
    validVoters,
    electionName,
    userID,
  } = req.body;
  try {
    // Get reference to the user info in the database
    const userRef = db.ref("users/" + userID);
    // Get the users data from the firebase
    const snapshot = await userRef.once("value");
    const organizerName = snapshot.val().name;
    // Get reference to where elections are stored on the database
    const ref = db.ref("elections");
    // Push the new election to the database (Not on the blockchain yet)
    const newElection = await ref.push({
      candidates: candidates,
      startTime: humanToEpoch(startTime),
      endTime: humanToEpoch(endTime),
      validVoters: validVoters,
      electionName: electionName,
      organizerName: organizerName,
      organizerID: userID,
    });
    // Send the election ID to front end
    const electionID = newElection.key;
    res.send({ electionID: electionID });
  } catch (error) {
    res.status(400).send("bad request");
  }
});

// if organizer account is making a request, send all election data
// if user account is making request, send the candidate id they voted for
// or send false if they haven't voted or are if they are not a valid voter
app.get("/api/election/:electionID", verifyUser, async (req, res) => {
  const { userID, isOrganizer } = req.body;
  try {
    // get election data
    let electionData = await getElectionData(
      req.params.electionID,
      isOrganizer
    );
    if (isOrganizer) {
      if (electionData.organizerID === userID) {
        // Convert time from epoch to human readable time
        electionData.endTime = epochToHuman(electionData.endTime);
        electionData.startTime = epochToHuman(electionData.startTime);
        res.send(electionData);
      } else {
        res.status(400).send("bad request");
      }
    } else {
      let voterAccount = await userAccount(userID);
      // if the voter account does not exist or the election is not deployed on the blockchain, send "bad request"
      if (voterAccount === null || !electionData.hasOwnProperty("address")) {
        res.status(400).send("bad request");
        return;
      }
      const result = await voterData(voterAccount, electionData.address);
      const response = { voted: false, ...electionData };
      // If the voter is valid and has voted, add who they voted for to the response
      if (result.voted && result.validVoter) {
        response.voted = true;
        response.votedFor = result.votedFor;
      }
      res.send(response);
    }
  } catch (error) {
    res.status(400).send("bad request");
  }
});

// return all elections
// if user is organizer, return all data of the elections owned by organizer
// if user is voter, return all elections for which the user is eligible to vote in. 
// Data for each election returned here contains everything except list of voters
app.get("/api/election/", verifyUser, async (req, res) => {
  const { userID, isOrganizer } = req.body;
  const time = req.query.time;
  try {
    // Get reference to all elections in the database
    const electionRef = db.ref("elections");
    // Get the data of all elections
    const snapshot = await electionRef.once("value");
    let data = snapshot.val();
    // Get the current time
    let currDate = new Date(new Date().toISOString()).getTime();
    let validElectionData = {};
    let electionData = { upcoming: {}, previous: {}, ongoing: {} };
  
    if (isOrganizer) {
      // Loop through the elections to get all elections that this organizer is hosting
      for (let key in data) {
        let child = data[key];
        if (child.organizerID === userID) {
          child.endTime = epochToHuman(child.endTime);
          child.startTime = epochToHuman(child.startTime);
          validElectionData[key] = child;
        }
      }
    } else {
      let voterAccount = await userAccount(userID);
      if (voterAccount === null) {
        res.status(400).send("bad request");
        return;
      }
      // Loop through the electinos to get all elections that this voter can vote in
      for (let key in data) {
        if (data[key].hasOwnProperty("address")) {
          let temp = await getElectionData(key, isOrganizer);
          let result = await voterData(voterAccount, temp.address);
          let startTime = new Date(temp.startTime).getTime();
          let endTime = new Date(temp.endTime).getTime();
          if (result.validVoter) {
            validElectionData[key] = temp;
          }
        }
      }
    }
    // Loop through all elections that this organizer owns or this voter can vote in
    // and organize them if based on if the election is upcoming, ongoing, or has already ended
    for (let key in validElectionData) {
      let electionInfo = validElectionData[key];
      let startTime = new Date(electionInfo.startTime).getTime();
      let endTime = new Date(electionInfo.endTime).getTime();
      if (currDate < startTime || !electionInfo.hasOwnProperty("address")) {
        electionData["upcoming"][key] = electionInfo;
      } else if (currDate >= endTime) {
        electionData["previous"][key] = electionInfo;
      } else {
        electionData["ongoing"][key] = electionInfo;
      }
    }
    res.send(electionData[time]);
  } catch (error) {
    console.log(error);
    res.status(400).send("bad request");
  }
});

// If the user in a valid voter, cast their vote in the election on the network
app.put("/api/election/:electionID/vote", verifyUser, async (req, res) => {
  const { candidateID, userID, isOrganizer } = req.body;
  try {
    if (isOrganizer) {
      res.status(401).send("Unauthorized");
      return;
    }
    let voterAccount = await userAccount(userID);
    let electionDetails = await getElectionData(
      req.params.electionID,
      isOrganizer
    );
    if (voterAccount === null || electionDetails === null) {
      res.status(400).send("bad request");
      return;
    }
    // Get a connection to the voters account on the blockchain
    const provider = new HDWalletProvider({
      mnemonic: mnemonic,
      providerOrUrl: URL,
      addressIndex: voterAccount,
      numberOfAddresses: 1,
    });
    // Get a connection to the network with the provided account number
    const web3 = new Web3(provider);
    // Get a reference to the conract on the network
    const contract = await new web3.eth.Contract(abi, electionDetails.address);
    // Tell the contract to vote for the candidate
    const voteTx = await contract.methods
      .vote(candidateID)
      .send({ from: provider.getAddress(0) });
    // Send the transaction hash of the vote transaction to front end
    res.send({ "transaction hash": voteTx.transactionHash });
    provider.engine.stop();
  } catch (error) {
    // Send an appropriate response based on the error message
    let response = "bad request";
    const msg = error.message;
    if (msg.includes("Has no right to vote")) {
      response = "Not a valid voter";
    } else if (msg.includes("Already voted")) {
      response = "Vote has already been cast";
    }
    res.status(400).send(response);
  }
});

//validate voters endpoint
app.put("/api/election/:electionID/validate", verifyUser, async (req, res) => {
  const { userID, isOrganizer, validVoters } = req.body;
  try {
    const electionID = req.params.electionID;
    if (!isOrganizer) {
      res.status(401).send("Unauthorized");
      return;
    }
    let electionDetails = await getElectionData(electionID, isOrganizer);
    const organizerAccount = await userAccount(userID);
    const invalidVoterIDs = await validateVoters(
      validVoters,
      electionDetails.address,
      organizerAccount
    );
    for (let i in validVoters) {
      electionDetails.validVoters.push(validVoters[i]);
    }
    // Get reference to the specific election in the database
    const electionRef = db.ref("elections/" + electionID);
    // Update the valid voter information in the election 
    await electionRef.update({ validVoters: electionDetails.validVoters });
    res.send({ invalidVoterIDs: invalidVoterIDs });
  } catch (error) {
    res.status(400).send("bad request");
  }
});

// Deploy the given election onto the blockchain network if the user is an organizer
app.put("/api/election/:electionID/deploy", verifyUser, async (req, res) => {
  const { userID, isOrganizer } = req.body;
  try {
    const electionID = req.params.electionID;

    if (!isOrganizer) {
      res.status(401).send("Unauthorized");
      return;
    }
    let organizerAccount = await userAccount(userID);
    const allElectionData = await getElectionData(electionID, isOrganizer);
    let electionData = {};
    // If the election has already been deployed, send the address of the election on the network to the front end
    if (allElectionData.hasOwnProperty("address")) {
      res.status(206).send({ electionAddress: allElectionData.address });
      return;
    }
    // Check if the election has required properties and filter the election data
    if (
      allElectionData.organizerID === userID &&
      allElectionData.hasOwnProperty("candidates") &&
      allElectionData.hasOwnProperty("endTime") &&
      allElectionData.hasOwnProperty("startTime") &&
      allElectionData.hasOwnProperty("validVoters")
    ) {
      electionData.candidates = allElectionData.candidates;
      electionData.endTime = allElectionData.endTime;
      electionData.startTime = allElectionData.startTime;
      electionData.validVoters = allElectionData.validVoters;
    }
    
    // if election does not have the required properties or the organizer does not exist
    if (organizerAccount === null || electionData === {}) {
      res.status(400).send("bad request");
      return;
    }
    // Get a connection to the voters account on the blockchain
    const provider = new HDWalletProvider({
      mnemonic: mnemonic,
      providerOrUrl: URL,
      addressIndex: organizerAccount,
      numberOfAddresses: 1,
    });
    // Get a connection to the network with the provided account number
    const web3 = new Web3(provider);
    // Get a reference to the conract on the network
    const contract = await new web3.eth.Contract(abi);
    // Deploy the election onto the blockchain
    const deployTx = await contract
      .deploy({
        data: "0x" + bytecode,
        arguments: [
          electionData.candidates,
          electionData.endTime,
          electionData.startTime,
        ],
      })
      .send({ from: provider.getAddress(0), gas: 3000000 });
    // Get reference to the specific election in the database
    const electionRef = db.ref("elections/" + electionID);
    // Update the elections address information
    await electionRef.update({
      address: deployTx.options.address,
    });

    const validVoter = electionData.validVoters.map((v) => {
      return v.voterID;
    });
    let invalidVoterIDs = await validateVoters(
      validVoter,
      deployTx.options.address,
      organizerAccount
    );
    
    provider.engine.stop();
    // Send the election ID, election address, and a list of any invalid voters to the front end
    res.send({
      electionID: electionID,
      electionAddress: deployTx.options.address,
      invalidVoterIDs: invalidVoterIDs,
    });
  } catch (error) {
    res.status(400).send("bad request");
  }
});

// login endpoint
app.post("/api/login", async (req, res) => {
  const idToken = req.body.idToken.toString();
  const expiresIn = 59 * 60 * 1000; // session cookie expires in 59 minutes
  let isOrganizer, uid;
  // Verify the id token
  await admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      uid = decodedToken.uid;
      isOrganizer = decodedToken.isOrganizer;
    })
    .catch((error) => {
      res.end("Unauthorized");
    });
  // Create the session cookie
  admin
    .auth()
    .createSessionCookie(idToken, { expiresIn })
    .then(
      (sessionCookie) => {
        const options = { maxAge: expiresIn, httpOnly: true };
        res.cookie("session", sessionCookie, options);
        res.send({ isOrganizer: isOrganizer });
      },
      (error) => {
        res.status(401);
        if (error.hasOwnProperty("message")) {
          res.send(error.message);
        }
        res.send("Unauthorized");
      }
    );
});

// logout endpoint
app.get("/api/logout", (req, res) => {
  res.clearCookie("session");
  res.send("logged out");
});

// register endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, isOrganizer } = req.body;
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
    });
    await admin
      .auth()
      .setCustomUserClaims(userRecord.uid, { isOrganizer: isOrganizer });
    const accRef = db.ref("accounts");
    let acc = 10;
    const snapshot = await accRef.once("value");
    if (snapshot.val() !== null) {
      acc = snapshot.val().account + 1;
    }
    // Get reference to where users are stored in the database and create a new user
    const ref = db.ref("users");
    const currUser = ref.child(userRecord.uid);
    const newUser = { name: name, email: email, account: acc };
    await currUser.update(newUser);
    await accRef.set({ account: acc });

    res.send("User successfully registered");
  } catch (error) {
    res.status(400);
    if (error.hasOwnProperty("message")) {
      res.send(error.message);
    } else {
      res.send("bad request");
    }
  }
});

// updates specified election data
app.put("/api/election/:electionID/update", verifyUser, async (req, res) => {
  if (!req.body.isOrganizer) {
    res.status(401).send("Unauthorized");
    return;
  }
  const {
    electionName,
    candidates,
    startTime,
    endTime,
    validVoters,
  } = req.body;
  try {
      // Setup the new information to update to
    const updates = {
      candidates: candidates,
      startTime: humanToEpoch(startTime),
      endTime: humanToEpoch(endTime),
      validVoters: validVoters,
      electionName: electionName,
    };
    // Update the specific election
    await db.ref("elections/" + req.params.electionID).update(updates);
    res.send({ electionID: req.params.electionID });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

// returns an object with the election winner, an array with each candidates name and their vote count,
// and total number of votes casted during the election
app.get("/api/election/:electionID/result", verifyUser, async (req, res) => {
  const { userID } = req.body;
  try {
    let Account = await userAccount(userID);
    let electionDetails = await getElectionData(req.params.electionID, false);
    if (Account === null || electionDetails === null) {
      res.status(400).send("bad request");
      return;
    }
    // Get a connection to the voters account on the blockchain
    const provider = new HDWalletProvider({
      mnemonic: mnemonic,
      providerOrUrl: URL,
      addressIndex: Account,
      numberOfAddresses: 1,
    });
    // Get a connection to the network with the provided account number
    const web3 = new Web3(provider);
    // Get the voter's information from the network
    const contract = await new web3.eth.Contract(abi, electionDetails.address);

    let electionResults = {};
    const numOfCandidates = await contract.methods.numberOfCandidates().call();
    let tempResults = [];
    let numVotes = 0;
    // Loop through all candidates and get their information
    for (let i = 0; i < numOfCandidates; i++) {
      let candidate = await contract.methods.candidates(i).call();
      tempResults.push({ name: candidate.name, votes: candidate.voteCount });
      numVotes += parseInt(candidate.voteCount);
    }
    // Get the winner of the election
    const winner = await contract.methods.getWinner().call();
    
    // Setup return information to send to front end 
    electionResults["totalVotes"] = numVotes;
    electionResults["results"] = tempResults;
    electionResults["winner"] = winner;

    res.send(electionResults);
    
    provider.engine.stop();
  } catch (error) {
    // send appropriate error message to front end
    let response = "bad request";
    const msg = error.message;
    if (msg.includes("Election end time has not passed")) {
      response = "Election has not ended";
    }
    res.status(400).send(response);
  }
});

app.get("/api/user/info", verifyUser, async (req, res) => {
  const { userID, isOrganizer } = req.body;
  // Get reference to the user in the database
  var userRef = db.ref("users/" + userID);
  // Get users data and send to front end
  userRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (isOrganizer) {
      res.send({
        name: data.name,
        email: data.email,
        userID: userID,
        accountType: "Organizer",
      });
    } else {
      res.send({
        name: data.name,
        email: data.email,
        userID: userID,
        accountType: "Voter",
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
