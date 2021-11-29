import log from "loglevel";
import Snackbar from "material-ui/Snackbar/Snackbar";
import React from "react";
import snackStore from "./snack.store";

class SnackBarContainer extends React.Component {
    componentWillUnmount = () => {
        this.observerDisposables.forEach(disposable => disposable.dispose?.());
    };

    registerDisposable = disposable => {
        this.observerDisposables.push(disposable);
    };

    constructor(props, context) {
        super(props, context);

        this.state = {
            show: false,
            snack: {
                message: "",
            },
        };
    }

    componentWillMount = () => {
        this.observerDisposables = [];

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
    };

    _closeSnackbar = () => {
        this.setState({
            show: false,
        });
    };

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
                //eslint-disable-next-line
                ref="snackbar"
                message={message}
                action={action}
                autoHideDuration={autoHideDuration === undefined ? 6000 : autoHideDuration}
                open={this.state.show}
                onActionTouchTap={onActionTouchTap}
                onRequestClose={this._closeSnackbar}
            />
        );
    }
}

export default SnackBarContainer;
