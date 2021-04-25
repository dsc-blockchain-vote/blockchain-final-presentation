import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Drawer from "@material-ui/core/Drawer";
import List from "@material-ui/core/List";
import Divider from "@material-ui/core/Divider";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import PropTypes from "prop-types";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import AllInboxIcon from "@material-ui/icons/AllInbox";
import MeetingRoomIcon from "@material-ui/icons/MeetingRoom";
import CreateIcon from "@material-ui/icons/Create";
import axios from "axios";
import { Link, Link as RouterLink } from "react-router-dom";
import IconButton from "@material-ui/core/IconButton";
import AccountCircleIcon from "@material-ui/icons/AccountCircle";

const drawerWidth = 240;
const URL = process.env.REACT_APP_API_URL;
const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
  appBar: {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: drawerWidth,
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
  },
  logout: {
    marginTop: "210%"
  },
  // necessary for content to be below app bar
  toolbar: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(3),
  },
}));

export default function LeftDrawer() {
  const classes = useStyles();
  const [user, setUser] = useState(window.sessionStorage.getItem("user"));
  window.onstorage = () => {
    let val = window.sessionStorage.getItem("user");
    if (val !== null && val !== user) setUser(val);
  };

  //clears the session cookie to logout the current user
  const logout = () => {
    axios
      .get(URL + "/api/logout", { withCredentials: true })
      .then((response) => {
        console.log("Logged out Succesfully!");
        window.sessionStorage.clear();
        window.location.assign("/login");
      })
      .catch((error) => {
        alert(error.message);
      });
  };
  return (
    <Drawer
      className={classes.drawer}
      variant="permanent"
      classes={{
        paper: classes.drawerPaper,
      }}
      anchor="left"
    >
      <div className={classes.toolbar} />
      {user !== null && (
        <IconButton component={Link} to="/profile">
          <AccountCircleIcon fontSize="large" />
        </IconButton>
      )}

      <Divider />
      <List>
        {user !== null && (
          <ListItemLink
            to="/elections"
            primary="Elections List"
            icon={<AllInboxIcon />}
          />
        )}
        {user === "organizer" && (
          <ListItemLink
            to="/elections/create"
            primary="Create Election"
            icon={<CreateIcon />}
          />
        )}
        <Divider/>
        {user === null && <ListItemLink to="/login" primary="Login" />}
        {user === null && <ListItemLink to="/signup" primary="Sign Up" />}
        {user !== null && (
          <ListItem button className={classes.logout}>
            <ListItemIcon>
              <MeetingRoomIcon />
            </ListItemIcon>
            <ListItemText onClick={logout}>Logout</ListItemText>
          </ListItem>
        )}
      </List>
    </Drawer>
  );
}

function ListItemLink(props) {
  const { icon, primary, to } = props;

  const renderLink = React.useMemo(
    () =>
      React.forwardRef((itemProps, ref) => (
        <RouterLink to={to} ref={ref} {...itemProps} />
      )),
    [to]
  );

  return (
    <li>
      <ListItem button component={renderLink}>
        {icon ? <ListItemIcon>{icon}</ListItemIcon> : null}
        <ListItemText primary={primary} />
      </ListItem>
    </li>
  );
}

ListItemLink.propTypes = {
  icon: PropTypes.element,
  primary: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
};
