import React from "react";
import { Route, Switch } from "react-router-dom";
import LandingView from "../views/LandingView/LandingView";
import BallotView from "../views/BallotView/BallotView";
import CreateElectionView from "../views/ElectionFormView/CreateElectionView";
import EditElectionView from "../views/ElectionFormView/EditElectionView";
import Login from "../views/LoginAndSignupView/Login";
import Signup from "../views/LoginAndSignupView/Signup";
import ElectionListView from "../views/ElectionListView/ElectionListView";
import ResultsView from "../views/ResultsView/ResultsView";
import Profile from "../views/ProfileView/Profile";
import NotFoundView from "../views/NotFoundView/NotFoundView";
import LeftDrawer from "../common/LeftDrawer";
import NavBar from "../common/NavBar";
import makeStyles from "@material-ui/core/styles/makeStyles";

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
    },
    appBar: {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: drawerWidth,
    },
    appBarFull: {
        width: "100%",
        marginLeft: 0,
    },
}));

export default function RouteHandler() {
    const classes = useStyles();
    return (
        <div>
            <NavBar title="dVote" />
            <LeftDrawer />
            <div className={classes.appBar}>
                <Switch>
                    <Route path="/profile" component={Profile} />
                    <Route
                        exact
                        path="/elections"
                        component={ElectionListView}
                    />
                    <Route
                        exact
                        path="/elections/create"
                        component={CreateElectionView}
                    />
                    <Route
                        exact
                        path="/elections/:id/ballot"
                        component={BallotView}
                    />
                    <Route
                        exact
                        path="/elections/:id/edit"
                        component={EditElectionView}
                    />
                    <Route
                        exact
                        path="/elections/:id/results"
                        component={ResultsView}
                    />
                    <Route path="*" component={NotFoundView} />
                </Switch>
            </div>
        </div>
    );
}
