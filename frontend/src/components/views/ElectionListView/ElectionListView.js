import React, { useEffect, useState } from "react";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import { grey } from "@material-ui/core/colors";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import TimerIcon from "@material-ui/icons/Timer";
import EventIcon from "@material-ui/icons/Event";
import DoneIcon from "@material-ui/icons/Done";
import Typography from "@material-ui/core/Typography";
import Divider from "@material-ui/core/Divider";
import Container from "@material-ui/core/Container";
import CircularProgress from "@material-ui/core/CircularProgress";
import Fade from "@material-ui/core/Fade";
import format from "date-fns/format";
import parseJSON from "date-fns/parseJSON";
import distanceInWordsToNow from "date-fns/formatDistanceToNow";
import { Link, useLocation } from "react-router-dom";
import { Button, ButtonGroup, Grid, Tooltip } from "@material-ui/core";
import axios from "axios";

const URL = process.env.REACT_APP_API_URL;

const useStyles = makeStyles({
    root: {
        flexGrow: 1,
        // maxWidth: 500,
    },
    tabPanel: {
        marginTop: "20px",
    },
    paper: {
        padding: 20,
        marginTop: 20,
        marginBottom: 20,
    },
    divider: {
        marginTop: 10,
        marginBottom: 20,
    },
    buttonProgress: {
        position: "relative",
        color: grey[900],
        marginTop: 0,
        marginLeft: -36,
    },
});
// Parse election data from a JSON response
function parseElections(data) {
    let result = {};

    for (let id in data) {
        const election = data[id];
        const startTime = parseJSON(election.startTime);
        const endTime = parseJSON(election.endTime);
        election.startTime = startTime;
        election.endTime = endTime;
        election.deployed = election.hasOwnProperty("address");
        result[id] = election;
    }
    return result;
}

// Parse election date to produce a duration string
function getDurationString(election) {
    const start = election.startTime;
    const end = election.endTime;

    const now = new Date();

    // Upcoming election
    if (now < start) {
        return `Starts in ${distanceInWordsToNow(start)}`;
    }
    // Previous election
    else if (now > end) {
        return `Ended ${distanceInWordsToNow(end)} ago`;
    }
    // In progress election
    else {
        return `Ends in ${distanceInWordsToNow(end)}`;
    }
}

export default function ElectionListView(props) {
    const classes = useStyles();
    const search = useLocation().search;
    let getTab = new URLSearchParams(search).get("tab");
    let tab = 0;
    if (getTab !== null) tab = parseInt(getTab);
    if (tab > 2 || tab < 0) tab = 0;
    const [value, setValue] = React.useState(tab);

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    return (
        <div className={classes.root}>
            <Paper className={classes.root}>
                <Tabs
                    value={value}
                    onChange={handleChange}
                    variant="fullWidth"
                    indicatorColor="secondary"
                    textColor="secondary"
                    aria-label="icon label tabs example"
                >
                    <Tab icon={<TimerIcon />} label="Current elections" />
                    <Tab icon={<EventIcon />} label="Upcoming elections" />
                    <Tab icon={<DoneIcon />} label="Concluded elections" />
                </Tabs>
            </Paper>
            <Fade in>
                <Container>
                    <TabPanel value={value} index={0}>
                        <Typography variant="h4">Current elections</Typography>
                        <Divider className={classes.divider} />
                        <ElectionList type={"ongoing"} />
                    </TabPanel>
                    <TabPanel value={value} index={1}>
                        <Typography variant="h4">Upcoming elections</Typography>
                        <Divider className={classes.divider} />
                        <ElectionList type={"upcoming"} />
                    </TabPanel>
                    <TabPanel value={value} index={2}>
                        <Typography variant="h4">
                            Concluded elections
                        </Typography>
                        <Divider className={classes.divider} />
                        <ElectionList type={"previous"} />
                    </TabPanel>
                </Container>
            </Fade>
        </div>
    );
}

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    const classes = useStyles();
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`wrapped-tabpanel-${index}`}
            aria-labelledby={`wrapped-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Container maxWidth="lg" className={classes.tabPanel}>
                    {children}
                </Container>
            )}
        </div>
    );
}

// Represents a single 'tab' containing a list of elections
function ElectionList(props) {
    const classes = useStyles();
    const [elections, setElections] = React.useState({});
    const [loading, setLoading] = React.useState(false);

    // get elections for this user
    useEffect(() => {
        setLoading(true);
        axios
            .get(URL + "/api/election", {
                params: {
                    time: props.type,
                },
                withCredentials: true,
            })
            .then((response) => {
                setElections(parseElections(response.data));
                setLoading(false);
            })
            .catch((error) => {
                if (error.response.status === 401) {
                    window.sessionStorage.clear();
                    window.location.href = "/login";
                }
                setLoading(false);
            });
    }, [props.type]);

    // If the elections are loading, display a progress icon
    if (loading) {
        return (
            <Fade in={loading}>
                <Container>
                    <CircularProgress />
                </Container>
            </Fade>
        );
    }
    // If there are elections in the list, display
    if (elections && Object.keys(elections).length > 0) {
        return (
            <div>
                {Object.keys(elections).map((id) => {
                    const c = elections[id];
                    // set up duration string
                    let duration = "";
                    let range = `${format(
                        c.startTime,
                        "d MMM yyyy HH:mm"
                    )} to ${format(c.endTime, "d MMM yyyy HH:mm")}`;
                    duration = getDurationString(c);
                    return (
                        <Fade in={!loading}>
                            <Paper className={classes.paper}>
                                <Grid container alignItems="center" spacing={3}>
                                    <Grid item xs={10}>
                                        <Typography variant="h6">
                                            {c.electionName}
                                        </Typography>
                                        {/* show full date range when hovering on duration */}
                                        <Tooltip title={range} arrow>
                                            <Typography
                                                variant="subtitle2"
                                                display="inline"
                                            >
                                                {duration}
                                            </Typography>
                                        </Tooltip>
                                    </Grid>
                                    <Grid item xs={2}>
                                        <ElectionButton
                                            id={id}
                                            type={props.type}
                                            election={c}
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Fade>
                    );
                })}
            </div>
        );
    }
    // If the list exists but there are no elections for this search, alert the user
    if (elections) {
        return (
            <div>
                <Typography variant="h5">No elections found </Typography>
                <Typography>
                    If you believe this is an error, contact your organization's
                    administrator.
                </Typography>
            </div>
        );
    }
}

// Represents a button that changes contents based on the election results
function ElectionButton(props) {
    const [user, setUser] = useState(window.sessionStorage.getItem("user"));
    window.onstorage = () => {
        let val = window.sessionStorage.getItem("user");
        if (val !== null && val !== user) setUser(val);
    };
    let text = "View Election";
    let link = "";
    const classes = useStyles();
    const [disabled, setDisabled] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const deploy = () => {
        if (!loading) setLoading(true);
        axios({
            method: "put",
            url: URL + `/api/election/${props.id}/deploy`,
            withCredentials: true,
        })
            .then((response) => {
                setLoading(false);
                alert(
                    `Deployed election at address ${response.data["electionAddress"]}`
                );
                setDisabled(true);
            })
            .catch((error) => {
                setLoading(false);
                if (error.response.status === 400) {
                    alert(`An error occured while deploying election ${props.election.electionName}. Make sure you have validated at least 1 voter and try again.`)
                }
                if (error.response.status === 401) {
                    window.sessionStorage.clear();
                    window.location.href = "/";
                }
            });
    };

    if (props.type === "ongoing") {
        text = "Cast Ballot";
        if (user === "organizer") text = "View ballot";
        link = `/elections/${props.id}/ballot`;
    } else if (props.type === "upcoming") {
        text = "Edit";
        link = `/elections/${props.id}/edit`;
    } else if (props.type === "previous") {
        text = "View Results";
        link = `/elections/${props.id}/results`;
    }

    if (props.type === "upcoming") {
        if (user !== "organizer") {
            return <></>;
        }

        // If the election is undeployed and the start date has passed, disable the deploy button
        const now = new Date();
        let tooltip = "";
        let deployable = true;
        if (props.election.startTime <= now) {
            deployable = false;
            tooltip = "Cannot deploy elections past start date";
        }

        // If the election is already deployed, disable the deploy button
        if (props.election.deployed) {
            tooltip = "Election is already deployed";
        }

        return (
            <div>
                <Tooltip title={tooltip}>
                    <ButtonGroup
                        fullWidth
                        size="large"
                        style={loading ? { filter: "blur(2px)" } : {}}
                    >
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={deploy}
                            disabled={
                                disabled ||
                                props.election.deployed ||
                                loading ||
                                !deployable
                            }
                        >
                            Deploy
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            component={Link}
                            to={{ pathname: link }}
                            disabled={
                                disabled || props.election.deployed || loading
                            }
                        >
                            {text}
                        </Button>
                    </ButtonGroup>
                </Tooltip>
                {loading && (
                    <CircularProgress
                        size={32}
                        className={classes.buttonProgress}
                    />
                )}
            </div>
        );
    }

    return (
        <Button
            variant="contained"
            color="primary"
            component={Link}
            to={{
                pathname: link,
                state: {
                    election: props.election,
                    id: props.id,
                },
            }}
            disabled={!props.election.deployed}
        >
            {text}
        </Button>
    );
}
