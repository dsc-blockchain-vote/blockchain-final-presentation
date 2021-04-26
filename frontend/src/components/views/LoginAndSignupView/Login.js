import React, { useState } from "react";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import "../../../App.css";
import { Link } from "react-router-dom";
import firebase from "firebase";
import { makeStyles } from "@material-ui/core";
import CircularProgress from "@material-ui/core/CircularProgress";
import axios from "axios";
import NavBar from "../../common/NavBar";

const useStyles = makeStyles((theme) => ({
    helperText: {
        color: "red",
    },
    paperStyle: {
        padding: 20,
        height: "47vh",
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
export default function Component() {
    const classes = useStyles();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({ email: "", password: "" });
    const [disabled, setDisabled] = useState(true);
    const [loading, setLoading] = React.useState(false);
    const authorized = window.sessionStorage.getItem("authorized");

    // if already authenticated redirect to elections
    if (authorized) window.location.href = "/elections";

    if (!firebase.apps.length) {
        firebase.initializeApp({
            apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
            authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        });
    } else {
        firebase.app(); // if already initialized, use that one
    }

    //stores the values of any input fields that are updated and also checks for any input errors
    const handleInputChange = (e) => {
        validation(e.target.name, e.target.value);
        if (e.target.name === "email") setEmail(e.target.value);
        else if (e.target.name === "password") setPassword(e.target.value);
        if (email && password && errors.email === "" && errors.password === "")
            setDisabled(false);
        else setDisabled(true);
    };

    //checks the input fields for any kind of invalid input that was entered
    const validation = (name, value) => {
        if (name === "email")
            errors.email = emailRegex.test(value) ? "" : "Invalid email ID";
        else if (name === "password") {
            errors.password =
                value.length < 6
                    ? "Password should be atleast 6 characters long"
                    : "";
        }
    };

    //logs in the cuurent user by creating a new session cookie
    const handleSubmit = () => {
        if (
            email &&
            password &&
            errors.email === "" &&
            errors.password === ""
        ) {
            // As httpOnly cookies are to be used, do not persist any state client side.
            if (!loading) setLoading(true);
            firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
            firebase
                .auth()
                .signInWithEmailAndPassword(email, password)
                .then(({ user }) => {
                    return user.getIdToken().then((idToken) => {
                        return axios
                            .post(
                                URL + "/api/login",
                                { idToken: idToken },
                                { withCredentials: true }
                            )
                            .then((response) => {
                                console.log("Logged in Succesfully!");
                                let user = null;
                                if (response.data.isOrganizer)
                                    user = "organizer";
                                else user = "voter";
                                window.sessionStorage.setItem("user", user);
                                window.sessionStorage.setItem(
                                    "authorized",
                                    "true"
                                );
                                setLoading(false);
                                window.location.href = "/elections";
                            })
                            .catch((error) => {
                                setLoading(false);
                                console.log(error);
                            });
                    });
                })
                .catch((error) => {
                    setLoading(false);
                    alert(error.message);
                });
        }
    };

    return (
        <div>
            <NavBar title="dVote" fullWidth />
            <Paper elevation={10} className={classes.paperStyle}>
                <Box>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography
                                variant="h5"
                                style={{
                                    textAlign: "center",
                                    fontWeight: "bold",
                                }}
                            >
                                Login
                            </Typography>
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
                                helperText={
                                    errors.password ? errors.password : ""
                                }
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
                            <Link to="/signup">
                                <li>Don't have an account? Sign up here</li>
                            </Link>
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
                                Login
                            </Button>
                            {loading && (
                                <CircularProgress
                                    size={24}
                                    className={classes.buttonProgress}
                                />
                            )}
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        </div>
    );
}
