import Button from "@material-ui/core/Button/Button";
import Container from "@material-ui/core/Container/Container";
import Divider from "@material-ui/core/Divider/Divider";
import makeStyles from "@material-ui/core/styles/makeStyles";
import Typography from "@material-ui/core/Typography/Typography";
import { Link } from "react-router-dom";
import React, { Component } from "react";

const useStyles = makeStyles({
    root: {
        flexGrow: 1,
    },
    divider: {
        marginTop: 10,
        marginBottom: 20,
    },
    header: {
        padding: 20,
    },
    button: {
        marginTop: 10,
    }
});

export default function NotFoundView(props) {
    const classes = useStyles();
    return (
        <div className={classes.root}>
            <Container className={classes.header}>
                <Typography variant="h4">Page not found</Typography>
                <Divider className={classes.divider} />
                <Typography>The page you requested was not found.</Typography>
                <Button variant="contained" color="primary" className={classes.button} component={Link} to={{ pathname: "/elections" }}>Back to dashboard</Button>
            </Container>
        </div>
    );
}
