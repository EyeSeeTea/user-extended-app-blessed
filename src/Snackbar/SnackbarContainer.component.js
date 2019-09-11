import React from "react";
import Snackbar from "material-ui/Snackbar/Snackbar";
import snackStore from "./snack.store";
import ObserverRegistry from "../utils/ObserverRegistry.mixin";
import log from "loglevel";

const SnackBarContainer = React.createClass({
    mixins: [ObserverRegistry],

    getInitialState() {
        return {
            show: false,
            snack: {
                message: "",
            },
        };
    },

    componentWillMount() {
        const snackStoreDisposable = snackStore.subscribe(snack => {
            if (snack) {
                this.setState({
                    snack,
                    show: true,
                });
            } else {
                this.setState({
                    show: false,
                });
            }
        }, log.debug.bind(log));

        this.registerDisposable(snackStoreDisposable);
    },

    _closeSnackbar() {
        this.setState({
            show: false,
        });
    },

    render() {
        if (!this.state.snack) {
            return null;
        }

        const { message, action, autoHideDuration, onActionTouchTap } = this.state.snack;

        return (
            <Snackbar
                style={{ whiteSpace: "nowrap", zIndex: 1000000 }}
                bodyStyle={{ maxWidth: "100%" }}
                contentStyle={{ display: "flex" }}
                ref="snackbar"
                message={message}
                action={action}
                autoHideDuration={autoHideDuration === undefined ? 6000 : autoHideDuration}
                open={this.state.show}
                onActionTouchTap={onActionTouchTap}
                onRequestClose={this._closeSnackbar}
            />
        );
    },
});

export default SnackBarContainer;
