import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Drawer from "@material-ui/core/Drawer";
import List from "@material-ui/core/List";
import Divider from "@material-ui/core/Divider";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import PropTypes from 'prop-types';
import ListItemIcon from "@material-ui/core/ListItemIcon";
import AllInboxIcon from '@material-ui/icons/AllInbox';
import CreateIcon from '@material-ui/icons/Create';
import axios from 'axios';
import Button from "@material-ui/core/Button";
import { Link, Link as RouterLink } from 'react-router-dom';
import IconButton from "@material-ui/core/IconButton";
import AccountCircleIcon from '@material-ui/icons/AccountCircle';

const drawerWidth = 240;

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
    // necessary for content to be below app bar
    toolbar: theme.mixins.toolbar,
    content: {
        flexGrow: 1,
        backgroundColor: theme.palette.background.default,
        padding: theme.spacing(3),
    },
}));

export default function LeftDrawer(props) {
    const classes = useStyles();
 
    //clears the session cookie to logout the current user
    const logout = () => {
        axios.get('http://localhost:5000/api/logout', {withCredentials: true})
        .then(response => {
          console.log('Logged out Succesfully!');
          props.setLoggedIn(false);
          window.location.assign("/login");
        })
        .catch(error => {
          alert(error.message);
        })
    }

    useEffect(() => {
      // console.log(props.loggedIn)
  }, []);

    if (props.loggedIn === true && props.type === "organizer"){
      return (
        <Drawer
            className={classes.drawer}
            variant="permanent"
            classes={{
                paper: classes.drawerPaper,
            }}
            anchor="left"
        >
            {/* TODO: align logo in toolbar to navbar */}
            <div className={classes.toolbar} />
            <IconButton component={Link} to={{
                pathname: "/profile",
                state : {}
              }}>
                  <AccountCircleIcon fontSize="large"/>
            </IconButton>

            <Divider />
            <List>
                <ListItemLink to="/elections" primary="Elections List" icon={<AllInboxIcon />} />
                <ListItemLink to="/elections/create" primary="Create Election" icon={<CreateIcon />} />
                <Button onClick={logout}>Logout</Button>
            </List>
            <Divider />
        </Drawer>
      );
    }
    if (props.loggedIn === true && props.type === "voter"){
      return (
        <Drawer
            className={classes.drawer}
            variant="permanent"
            classes={{
                paper: classes.drawerPaper,
            }}
            anchor="left"
        >
            {/* TODO: align logo in toolbar to navbar */}
            <div className={classes.toolbar} />
            <IconButton component={Link} to={{
                pathname: "/profile",
                state : {}
              }}>
                  <AccountCircleIcon fontSize="large"/>
            </IconButton>

            <Divider />
            <List>
                <ListItemLink to="/elections" primary="Elections List" icon={<AllInboxIcon />} />
                <Button onClick={logout}>Logout</Button>
            </List>
            <Divider />
        </Drawer>
      );
    }
  else {
    return (
      <Drawer
          className={classes.drawer}
          variant="permanent"
          classes={{
              paper: classes.drawerPaper,
          }}
          anchor="left"
      >
          {/* TODO: align logo in toolbar to navbar */}
          <div className={classes.toolbar} />
          <Divider />
          <List>
              <Button component={Link} to={{
                pathname: "/login",
                // state : {setLogin: props.setLogin}
              }}>Login</Button>
              <ListItemLink to="/signup" primary="Sign Up" />
              <Button onClick={logout}>Logout</Button>
          </List>
          <Divider />
      </Drawer>
  );
  }
}

function ListItemLink(props) {
    const { icon, primary, to } = props;
  
    const renderLink = React.useMemo(
      () => React.forwardRef((itemProps, ref) => <RouterLink to={to} ref={ref} {...itemProps} />),
      [to],
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