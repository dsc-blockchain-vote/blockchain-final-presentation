import React, { useState } from "react";
import CssBaseline from "@material-ui/core/CssBaseline";
import { makeStyles } from "@material-ui/core/styles";
import RouteHandler from "./components/router/RouteHandler";
import { Route, Switch } from "react-router-dom";
import LandingView from "./components/views/LandingView/LandingView";
import Login from "./components/views/LoginAndSignupView/Login";
import Signup from "./components/views/LoginAndSignupView/Signup";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
  // necessary for content to be below app bar
  toolbar: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(0),
  },
}));

function App() {
  const classes = useStyles();
  const [user, setUser] = useState(window.sessionStorage.getItem("authorized"));
  window.onstorage = () => {
    let val = window.sessionStorage.getItem("authorized");
    if (val !== null && val !== user) setUser(val);
  };
  return (
    <div className={classes.root}>
      <CssBaseline />
      {/* <LeftDrawer /> */}
      <main className={classes.content}>
        <div className={classes.toolbar} />
        {/* Page content goes here */}
        <Switch>
          <Route exact path="/" component={LandingView} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          {!user && <Route path="/" component={LandingView} />}
          <Route path="*" component={RouteHandler} />
        </Switch>
      </main>
    </div>
  );
}
export default App;
