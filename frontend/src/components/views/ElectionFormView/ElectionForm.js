import React, { Component } from "react";
import Button from "@material-ui/core/Button";
import { makeStyles } from "@material-ui/core/styles";
import Settings from "./Settings";
import Candidates from "./Candidates";
import VotersList from "./VotersList";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import parseISO from "date-fns/parseISO";
import axios from "axios";
import { CircularProgress } from "@material-ui/core";
import { Alert } from "@material-ui/lab";
import { add } from "date-fns";

const emailRegex = RegExp(
  /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i
);

const URL = process.env.REACT_APP_API_URL;

// The form for creating and editing elections
// TODO: We should split ElectionForm into CreateElectionForm and EditElectionForm to make this code significantly easier to maintain
// This code is the result of a series of questionable design decisions
class ElectionForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      title: "",
      start: add(new Date(),{
        days: 1
      }),
      end: add(new Date(),{
        days: 1
      }),
      candidates: [],
      voters: [],
      loading: false,
      errors: {
        title: "",
        candidateName: [],
        voterName: [],
        voterID: [],
        email: [],
      },
    };
    if (this.props.edit) {
      this.loading = true;
    } else {
      this.loading = false;
    }
  }

  useStyles = makeStyles((theme) => ({
    root: {
      flexGrow: 1,
    },
    divider: {
      marginTop: theme.spacing(3),
    },
  }));

  componentDidMount() {
    if (this.props.edit) {
      this.loading = true;
      this.getData();
      this.loading = false;
    }
  }

  //changes the value stored in title and the candidates list on receiving an input
  handleInputChange = (e, id) => {
    if (e.target.name === "title") {
      this.validation("title", e.target.value, id);
      this.setState({ title: e.target.value });
    } else if (e.target.name === "candidate") {
      this.validation("candidateName", e.target.value, id);
      const candidates = [...this.state.candidates];
      const index = candidates.map((c) => c.id).indexOf(id);
      candidates[index].name = e.target.value;
      this.setState({ candidates });
    } else {
      const voters = [...this.state.voters];
      const index = voters.map((v) => v.id).indexOf(id);
      if (e.target.name === "name") {
        this.validation("voterName", e.target.value, id);
        voters[index].name = e.target.value;
      }
      if (e.target.name === "voterID") {
        this.validation("voterID", e.target.value, id);
        voters[index].voterID = e.target.value;
      }
      if (e.target.name === "voterEmail") {
        this.validation("email", e.target.value, id);
        voters[index].email = e.target.value;
      }
      this.setState({ voters });
    }
  };

  //checks for the validity of each input value entered and stores appropriate error messages in the error state variable
  validation = (name, value, id) => {
    let errors = { ...this.state.errors };
    if (name === "title") {
      errors.title = "";
      if (value.length === 0) errors.title = "Title should not be empty!";
      else if (!/^[a-zA-Z\s]+$/.test(value))
        errors.title = "Title should only consist of alphabets and spaces!";
    } else if (name === "candidateName") {
      delete errors.candidateName[id];
      if (value.length === 0)
        errors.candidateName[id] = "Candidate name should not be empty!";
      else if (!/^[a-zA-Z\s]+$/.test(value))
        errors.candidateName[id] =
          "Candidate name should only consist of alphabets and spaces!";
    } else if (name === "voterName") {
      delete errors.voterName[id];
      if (value.length === 0)
        errors.voterName[id] = "Voter name should not be empty!";
      else if (!/^[a-zA-Z\s]+$/.test(value))
        errors.voterName[id] =
          "Voter name should only consist of alphabets and spaces!";
    } else if (name === "voterID") {
      delete errors.voterID[id];
      if (!value) errors.voterID[id] = "Voter ID should not be empty";
      else if (/^[0-9\b]+$/.test(value)) 
        delete errors.voterID[id];
    } else if (name === "email") {
      delete errors.email[id];
      if (!emailRegex.test(value)) {
        errors.email[id] = "Invalid email ID";
      }
    }
    this.setState({ errors });
  };

  //changes the value of the start date on receiving input
  handleStartChange = (day) => {
    this.setState({ start: day });
  };

  //changes the value of the end date on receiving input
  handleEndChange = (day) => {
    this.setState({ end: day });
  };

  // The add part assumes that the ids are in increasing order
  // TODO: Consider different method of storing candidate ID
  addOrDelete = (name, id) => {
    if (name === "deleteCandidate") {
      const candidates = this.state.candidates.filter((c) => c.id !== id);
      this.setState({ candidates });
    } else if (name === "deleteVoter") {
      const voters = this.state.voters.filter((v) => v.id !== id);
      this.setState({ voters });
    } else if (name === "addCandidate") {
      const candidates = [...this.state.candidates];
      let newId = 0;
      if (candidates.length > 0) {
        newId = candidates[candidates.length - 1].id + 1;
      }
      candidates.push({ id: newId, name: "" });
      this.setState({ candidates });
    } else if (name === "addVoter") {
      const voters = [...this.state.voters];
      let newId = 0;
      if (voters.length > 0) {
        newId = voters[voters.length - 1].id + 1;
      }
      voters.push({ id: newId, name: "", voterID: null, email: "" });
      this.setState({ voters });
    }
  };

  // Create new election
  createElection = () => {
    console.log(this.state.errorText)
    if (
      this.checkForErrors("") &&
      this.checkForErrors("title") &&
      this.checkForErrors("date") &&
      !this.checkForErrors("candidatesEmpty") &&
      this.checkForErrors("candidate") &&
      !this.checkForErrors("votersEmpty") &&
      this.checkForErrors("voterName") &&
      this.checkForErrors("voterID") &&
      this.checkForErrors("email")
    ) {
      const election = {
        electionName: this.state.title,
        startTime: this.state.start.toISOString(),
        endTime: this.state.end.toISOString(),
        candidates: [],
        validVoters: this.state.voters,
      };
      for (let c in this.state.candidates) {
        election.candidates.push(this.state.candidates[c].name);
      }
      this.setState({ loading: true });
      axios({
        method: "post",
        url: URL + "/api/election/create",
        data: election,
        withCredentials: true,
      })
        .then((response) => {
          this.setState({ loading: false });
          alert("Election Saved successfully");
          window.location.href = "/elections/?tab=1";
        })
        .catch((error) => {
          this.setState({ loading: false });
          console.log(error);
        });
    } 
  };

  // Edit an election
  // TODO: consider either merging editElection and createElection or splitting editing and creating election forms into two completely different components
  editElection = () => {
    if (
      this.checkForErrors("") &&
      this.checkForErrors("title") &&
      this.checkForErrors("date") &&
      !this.checkForErrors("candidatesEmpty") &&
      this.checkForErrors("candidate") &&
      !this.checkForErrors("votersEmpty") &&
      this.checkForErrors("voterName") &&
      this.checkForErrors("voterID") &&
      this.checkForErrors("email")
    ) {
      const election = {
        electionName: this.state.title,
        startTime: this.state.start.toISOString(),
        endTime: this.state.end.toISOString(),
        candidates: [],
        validVoters: this.state.voters,
      };
      for (let c in this.state.candidates) {
        election.candidates.push(this.state.candidates[c].name);
      }
      this.setState({ loading: true });
      axios({
        method: "put",
        url: URL + `/api/election/${this.props.id}/update`,
        data: election,
        withCredentials: true,
      })
        .then((response) => {
          this.setState({ loading: false });
          alert("Election Saved successfully");
          window.location.href = "/elections/?tab=1";
        })
        .catch((error) => {
          this.setState({ loading: false });
          console.log(error);
        });
      }
  };

  //checks if there are no errors or no empty fields
  checkForErrors = (name) => {

    if(name === ""){
      if (!this.state.title ||
        !this.state.start ||
        !this.state.end){
          alert("Check the input fields again for any invalid or empty entry"); 
          return false
        }
        return true
    }
    if(name === "title"){
      if (this.state.errors.title){
        alert("Check the input fields again for any invalid or empty entry"); 
        return false
      }
      return true
    }
    if(name === "date"){
      if (this.state.start >= this.state.end || this.state.end <= this.state.start){
        alert("The start date should be before the end date");
        return false
      }
      return true
    }
    if (name === "candidate") {
      for (let i = 0; i < this.state.errors.candidateName.length; i++) {
        if (this.state.errors.candidateName[i]){
          alert("Check the input fields again for any invalid or empty entry"); 
          return false
        }
      }
      return true;
    }
    if (name === "voterName") {
      for (let i = 0; i < this.state.errors.voterName.length; i++) {
        if (this.state.errors.voterName[i]){
          alert("Check the input fields again for any invalid or empty entry"); 
          return false
        }
      }
      return true;
    }
    if (name === "voterID") {
      for (let i = 0; i < this.state.errors.voterID.length; i++) {
        if (this.state.errors.voterID[i]){
          alert("Check the input fields again for any invalid or empty entry"); 
          return false
        }
      }
      return true;
    }
    if (name === "email") {
      for (let i = 0; i < this.state.errors.email.length; i++) {
        if (this.state.errors.email[i]){
          alert("Check the input fields again for any invalid or empty entry"); 
          return false
        }
      }
      return true;
    }
    if (name === "candidatesEmpty") {
      if (this.state.candidates.length === 0){
        alert("The list of candidates cannot be empty");
        return true;
      }
      else {
        for (let i = 0; i < this.state.candidates.length; i++) {
          if (
            this.state.candidates[i].name === ""
          ){
            alert("One or more fields in the candidates section are empty");
            return true;
          }
        }
        return false;
      }
    } 
    else if (name === "votersEmpty") {
      if (this.state.voters.length === 0) {
        alert("The voters list cannot be empty");
        return true;
      }
      else {
        for (let j = 0; j < this.state.voters.length; j++) {
          if (
            this.state.voters[j].name === "" ||
            this.state.voters[j].voterID === null ||
            this.state.voters[j].email === ""
          ){
            alert("One or more fields in the voters list section are empty");
            return true;
          }
        }
        return false;
      }
    }
  };

  getData() {
    // if we are editing this page:
    if (this.props.edit) {
      axios
        .get(URL + `/api/election/${this.props.id}`, {
          withCredentials: true,
        })
        .then((response) => {
          const data = {};
          // load data into state
          data.title = response.data["electionName"];
          data.start = parseISO(response.data["startTime"]);
          data.end = parseISO(response.data["endTime"]);
          // load candidates
          const importCandidates = [];
          if (response.data["candidates"]) {
            for (let i = 0; i < response.data["candidates"].length; i++) {
              importCandidates.push({
                id: i,
                name: response.data["candidates"][i],
              });
            }
          }
          // load voters
          const importVoters = [];
          if (response.data["validVoters"]) {
            for (let i = 0; i < response.data["validVoters"].length; i++) {
              importVoters.push({
                id: i,
                ...response.data["validVoters"][i],
              });
            }
          }
          data.candidates = importCandidates;
          data.voters = importVoters;
          this.setState(data);
        })
        .catch((error) => {
          console.log(error);
        });
    }
  }

  render() {
    if (this.loading) {
      return (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <CircularProgress />
        </div>
      );
    }
    let onClick = this.createElection;
    let text = "Create";
    if (this.props.edit) {
      onClick = this.editElection;
      text = "Save";
    }
    return (
      <Container maxWidth="lg">
        <Grid container justify="flex-end" spacing={3}>
          <Grid item xs={12}>
            <Settings
              {...{
                startChange: this.handleStartChange,
                endChange: this.handleEndChange,
                inputChange: this.handleInputChange,
                title: this.state.title,
                start: this.state.start,
                end: this.state.end,
                errors: this.state.errors,
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <Candidates
              {...{
                addOrDelete: this.addOrDelete,
                inputChange: this.handleInputChange,
                candidates: this.state.candidates,
                errors: this.state.errors,
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <VotersList
              {...{
                addOrDelete: this.addOrDelete,
                inputChange: this.handleInputChange,
                voters: this.state.voters,
                errors: this.state.errors,
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <Alert variant="filled" severity="warning">
              Once you create an election, you must deploy it, for that election to be available for voting 
            </Alert>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={onClick}
              disabled={this.state.loading}
            >
              {text}
            </Button>
            {this.state.loading && <CircularProgress size={64} />}
          </Grid>
        </Grid>
      </Container>
    );
  }
}

export default ElectionForm;