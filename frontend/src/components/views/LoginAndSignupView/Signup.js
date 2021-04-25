import React, { useState } from "react";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import CircularProgress from "@material-ui/core/CircularProgress";
import "../../../App.css";
import axios from "axios";
import { makeStyles } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
  helperText: {
    color: "red",
  },
  paperStyle: {
    padding: 20,
    height: "65vh",
    width: 700,
    margin: "20px auto",
  },
  textField: {
    id: "outlined-error-helper-text",
    required: true,
  },
  buttonProgress: {
    position: "relative",
    marginTop: -100,
    marginLeft: -60,
  },
}));

const emailRegex = RegExp(
  /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i
);

const URL = process.env.REACT_APP_API_URL;

//function to display the input textbox for the election title and for picking the start and end dates
export default function Signup() {
  const classes = useStyles();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ name: "", email: "", password: "" });
  const [disabled, setDisabled] = useState(true);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const authorized = window.sessionStorage.getItem("authorized");

  // if already authenticated redirect to elections
  if (authorized) window.location.href = "/elections";

  //function to display the input textbox for the election title and for picking the start and end dates
  const handleInputChange = (e) => {
    validation(e.target.name, e.target.value);
    if (e.target.name === "name") setName(e.target.value);
    else if (e.target.name === "email") setEmail(e.target.value);
    else if (e.target.name === "password") setPassword(e.target.value);
    else if (e.target.name === "checked") setChecked(e.target.checked);
    if (
      name &&
      email &&
      password &&
      errors.name === "" &&
      errors.email === "" &&
      errors.password === ""
    )
      setDisabled(false);
    else setDisabled(true);
  };

  //checks the input fields for any kind of invalid input that was entered
  const validation = (name, value) => {
    if (name === "name") {
      if (value.length === 0) errors.name = "Name should not be empty!";
      else if (!/^[a-zA-Z\s]+$/.test(value))
        errors.name = "Name should only consist of alphabets and spaces!";
      else if (/^[a-zA-Z\s]+$/.test(value)) errors.name = "";
    } else if (name === "email")
      errors.email = emailRegex.test(value) ? "" : "Invalid email ID";
    else if (name === "password")
      errors.password =
        value.length < 6 ? "Password should be atleast 6 characters long" : "";
  };

  //signs up this user by storing their details in teh backend
  const handleSubmit = () => {
    if (
      name &&
      email &&
      password &&
      errors.name === "" &&
      errors.email === "" &&
      errors.password === ""
    ) {
      if (!loading) setLoading(true);
      let data = { name, email, password, isOrganizer: checked };
      axios
        .post(URL + "/api/register", data)
        .then((response) => {
          setLoading(false);
          alert("Signed up Succesfully!");
          window.location.href = "/";
        })
        .catch((error) => {
          alert(error.response.data);
          setLoading(false);
        });
    }
  };

  return (
    <Paper elevation={10} className={classes.paperStyle}>
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography
              variant="h5"
              style={{ textAlign: "center", fontWeight: "bold" }}
            >
              Sign up
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              className={classes.textField}
              helperText={errors.name ? errors.name : ""}
              FormHelperTextProps={{
                className: classes.helperText,
              }}
              label="Name"
              variant="outlined"
              name="name"
              value={name}
              fullWidth
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              className={classes.textField}
              helperText={errors.email ? errors.email : ""}
              FormHelperTextProps={{
                className: classes.helperText,
              }}
              label="Email ID"
              variant="outlined"
              name="email"
              type="email"
              value={email}
              fullWidth
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              className={classes.textField}
              helperText={errors.password ? errors.password : ""}
              FormHelperTextProps={{
                className: classes.helperText,
              }}
              label="Password"
              type="password"
              variant="outlined"
              name="password"
              value={password}
              fullWidth
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={checked}
                  onChange={handleInputChange}
                  name="checked"
                />
              }
              label="I am an Organizer"
            />
          </Grid>
          <Grid className="button">
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={disabled || loading}
              style={{ marginLeft: 10, marginTop: 5 }}
              onClick={handleSubmit}
            >
              Sign Up
            </Button>
            {loading && (
              <CircularProgress size={24} className={classes.buttonProgress} />
            )}
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}
