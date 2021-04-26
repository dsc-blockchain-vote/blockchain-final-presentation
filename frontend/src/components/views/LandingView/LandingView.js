import Button from "@material-ui/core/Button/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup/ButtonGroup";
import Card from "@material-ui/core/Card/Card";
import CardContent from "@material-ui/core/CardContent/CardContent";
import CardMedia from "@material-ui/core/CardMedia/CardMedia";
import Container from "@material-ui/core/Container/Container";
import Divider from "@material-ui/core/Divider/Divider";
import Grid from "@material-ui/core/Grid/Grid";
import makeStyles from "@material-ui/core/styles/makeStyles";
import Typography from "@material-ui/core/Typography/Typography";
import Link from "react-router-dom/Link";
import React, { Component } from "react";

const useStyles = makeStyles((theme) => ({
    container: {
        marginTop: 48,
    },
    divider: {
        marginTop: 32,
    },
    media: {
        height: '100%',
        paddingTop: '80%',
    },
    card: {
        width: "100%",
        margin: 'auto'
    },
    grid: {
        paddingTop: 32,
    }
}));

export default function LandingView(props) {
    const classes = useStyles();
    return (
        <Container className={classes.container}>
        <Grid container>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Typography variant="h2">
                        Create simple and secure elections
                    </Typography>
                </Grid>
                <Grid item xs={12}>
                    <ButtonGroup disableElevation>
                        <Button color="primary" variant="contained" component={Link} to={{ pathname: "/login" }}>
                            Sign in
                        </Button>
                        <Button color="primary" variant="outlined" component={Link} to={{ pathname: "/signup" }}>
                            Get started
                        </Button>
                    </ButtonGroup>
                </Grid>
            </Grid>
            <Grid item xs={12}>
                <Divider className={classes.divider} />
            </Grid>
            <Grid container spacing={8} className={classes.grid}>
                <Grid item xs={12} md={4}>
                    <Card className={classes.card}>
                        <CardMedia
                            className={classes.media}
                            image={`${process.env.PUBLIC_URL}/assets/timer.svg`}
                            title="Timer"
                        />
                        <CardContent>
                            <Typography variant="h5" component="h2">
                                Create elections in minutes
                            </Typography>
                            <Typography
                                variant="body2"
                                color="textSecondary"
                                component="p"
                            >
                                Go from nothing to a deployed election in less
                                than 5 minutes. No long forms or small, strict
                                election limits. Just enter your election
                                details and validate your voters.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card className={classes.card}>
                        <CardMedia
                            className={classes.media}
                            image={`${process.env.PUBLIC_URL}/assets/ballot.svg`}
                            title="Ballot"
                        />
                        <CardContent>
                            <Typography variant="h5" component="h2">
                                Easy for voters
                            </Typography>
                            <Typography
                                variant="body2"
                                color="textSecondary"
                                component="p"
                            >
                                We've created a simple process for voters to
                                participate in elections. Just create an
                                account, get your organization to verify your
                                identity, and you're ready to vote.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card className={classes.card}>
                        <CardMedia
                            className={classes.media}
                            image={`${process.env.PUBLIC_URL}/assets/lock.svg`}
                            title="Lock"
                        />
                        <CardContent>
                            <Typography variant="h5" component="h2">
                                Secure digital elections
                            </Typography>
                            <Typography
                                variant="body2"
                                color="textSecondary"
                                component="p"
                            >
                                We use blockchain technology to create secure
                                and transparent elections. You can have the convenience of
                                online elections without the hassle of keeping them secure.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Grid>
        </Container>
    );
}
