import React from "react";
import Paper from "material-ui/Paper/Paper";
import { Observable } from "rx";

import DetailsBox from "./DetailsBox.component";

export default class DetailsBoxWithScroll extends React.Component {
    componentDidMount = () => {
        this.disposable = Observable.fromEvent(global, "scroll")
            .debounce(200)
            .map(() => document.querySelector("body").scrollTop)
            .subscribe(() => this.forceUpdate());
    };

    componentWillUnmount = () => {
        this.disposable && this.disposable.dispose();
    };

    render = () => {
        return (
            <div style={this.props.style}>
                <Paper
                    zDepth={1}
                    rounded={false}
                    style={{
                        maxWidth: 500,
                        minWidth: 300,
                        marginTop: document.querySelector("body").scrollTop,
                    }}
                >
                    <DetailsBox
                        source={this.props.detailsObject.model}
                        showDetailBox={!!this.props.detailsObject}
                        onClose={this.props.onClose}
                    />
                </Paper>
            </div>
        );
    };
}
