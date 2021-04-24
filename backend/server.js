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

// get database
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

//helper functions
// get voter data from blockchain
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

// get user account corresponding to the userID or return null
const userAccount = async (userID) => {
  const userRef = db.ref("users/" + userID);
  const snapshot = await userRef.once("value");
  if (snapshot.val() === null) {
    return null;
  }
  return snapshot.val().account;
};

// get election data corresponding to the given election
const getElectionData = async (electionID, isOrganizer) => {
  const electionRef = db.ref("elections/" + electionID);
  const snapshot = await electionRef.once("value");
  const data = snapshot.val();
  if (data === null) {
    return null;
  }
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
  const provider = new HDWalletProvider({
    mnemonic: mnemonic,
    providerOrUrl: URL,
    addressIndex: organizerAccount,
    numberOfAddresses: 1,
  });
  const web3 = new Web3(provider);
  const deployedContract = await new web3.eth.Contract(abi, contractAddress);
  let invalidVoterIDs = [];
  let validVoterAddresses = [];
  for (let id in validVoters) {
    let voterAccount = await userAccount(validVoters[id]);
    if (voterAccount === null) {
      invalidVoterIDs.push(id);
      continue;
    }
    let voterProvider = new HDWalletProvider({
      mnemonic: mnemonic,
      providerOrUrl: URL,
      addressIndex: voterAccount,
      numberOfAddresses: 1,
    });
    validVoterAddresses.push(voterProvider.getAddress(0));
    voterProvider.engine.stop();
  }
  await deployedContract.methods
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

// verify the user has logged in
const verifyUser = (req, res, next) => {
  const sessionCookie = req.cookies.session || "";
  admin
    .auth()
    .verifySessionCookie(sessionCookie, true)
    .then((decodedClaims) => {
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
    const userRef = db.ref("users/" + userID);
    const snapshot = await userRef.once("value");
    const organizerName = snapshot.val().name;
    const ref = db.ref("elections");
    const newElection = await ref.push({
      candidates: candidates,
      startTime: humanToEpoch(startTime),
      endTime: humanToEpoch(endTime),
      validVoters: validVoters,
      electionName: electionName,
      organizerName: organizerName,
      organizerID: userID,
    });
    const electionID = newElection.key;
    res.send({ electionID: electionID });
  } catch (error) {
    res.status(400).send("bad request");
  }
});

// if organizer account is making a request, send all election data
// if user account is making request, send the candidate id they voted for
// or send false if they haven't voted or are not valid voters
app.get("/api/election/:electionID", verifyUser, async (req, res) => {
  const { userID, isOrganizer } = req.body;
  try {
    let electionData = await getElectionData(
      req.params.electionID,
      isOrganizer
    );
    if (isOrganizer) {
      if (electionData.organizerID === userID) {
        electionData.endTime = epochToHuman(electionData.endTime);
        electionData.startTime = epochToHuman(electionData.startTime);
        res.send(electionData);
      } else {
        res.status(400).send("bad request");
      }
    } else {
      let voterAccount = await userAccount(userID);
      if (voterAccount === null || !electionData.hasOwnProperty("address")) {
        res.status(400).send("bad request");
        return;
      }
      const result = await voterData(voterAccount, electionData.address);
      const response = { voted: false, ...electionData };
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
// if user is voter, return all elections for which the user is eligible. Data for each election
// returned here contains everything except list of voters
app.get("/api/election/", verifyUser, async (req, res) => {
  const { userID, isOrganizer } = req.body;
  const time = req.query.time;
  try {
    const electionRef = db.ref("elections");
    const snapshot = await electionRef.once("value");
    let data = snapshot.val();
    let currDate = new Date(new Date().toISOString()).getTime();
    let validElectionData = {};
    let electionData = { upcoming: {}, previous: {}, ongoing: {} };

    if (isOrganizer) {
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

// casting vote
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
    const provider = new HDWalletProvider({
      mnemonic: mnemonic,
      providerOrUrl: URL,
      addressIndex: voterAccount,
      numberOfAddresses: 1,
    });
    const web3 = new Web3(provider);
    const contract = await new web3.eth.Contract(abi, electionDetails.address);
    const voteTx = await contract.methods
      .vote(candidateID)
      .send({ from: provider.getAddress(0) });

    res.send({ "transaction hash": voteTx.transactionHash });
    provider.engine.stop();
  } catch (error) {
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
    const electionRef = db.ref("elections/" + electionID);
    await electionRef.update({ validVoters: electionDetails.validVoters });
    res.send({ invalidVoterIDs: invalidVoterIDs });
  } catch (error) {
    res.status(400).send("bad request");
  }
});

// starting election endpoint
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
    if (allElectionData.hasOwnProperty("address")) {
      res.status(206).send({ electionAddress: allElectionData.address });
      return;
    }
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
    if (organizerAccount === null || electionData === {}) {
      res.status(400).send("bad request");
      return;
    }
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
        arguments: [
          electionData.candidates,
          electionData.endTime,
          electionData.startTime,
        ],
      })
      .send({ from: provider.getAddress(0), gas: 3000000 });

    const electionRef = db.ref("elections/" + electionID);
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

    res.send({
      electionID: electionID,
      electionAddress: deployTx.options.address,
      invalidVoterIDs: invalidVoterIDs,
    });
  } catch (error) {
    res.status(400).send("bad request");
  }
});

// login end point
app.post("/api/login", async (req, res) => {
  const idToken = req.body.idToken.toString();
  const expiresIn = 59 * 60 * 1000; // session cookie expires in 59 minutes
  let isOrganizer, uid;
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

// updates election data
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
    const updates = {
      candidates: candidates,
      startTime: humanToEpoch(startTime),
      endTime: humanToEpoch(endTime),
      validVoters: validVoters,
      electionName: electionName,
    };

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
    const provider = new HDWalletProvider({
      mnemonic: mnemonic,
      providerOrUrl: URL,
      addressIndex: Account,
      numberOfAddresses: 1,
    });
    const web3 = new Web3(provider);
    const contract = await new web3.eth.Contract(abi, electionDetails.address);

    let electionResults = {};
    const numOfCandidates = await contract.methods.numberOfCandidates().call();
    let tempResults = [];
    let numVotes = 0;
    for (let i = 0; i < numOfCandidates; i++) {
      let candidate = await contract.methods.candidates(i).call();
      tempResults.push({ name: candidate.name, votes: candidate.voteCount });
      numVotes += parseInt(candidate.voteCount);
    }
    const winner = await contract.methods.getWinner().call();
    electionResults["totalVotes"] = numVotes;
    electionResults["results"] = tempResults;
    electionResults["winner"] = winner;

    res.send(electionResults);
    provider.engine.stop();
  } catch (error) {
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
  var starCountRef = db.ref("users/" + userID);
  starCountRef.on("value", (snapshot) => {
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
