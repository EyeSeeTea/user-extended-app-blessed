import AppWithD2 from "d2-ui/lib/app/AppWithD2.component";
import MainContent from "d2-ui/lib/layout/main-content/MainContent.component";
import SinglePanelLayout from "d2-ui/lib/layout/SinglePanel.component";
import { getInstance } from "d2/lib/d2";
import PropTypes from "prop-types";
import React from "react";
import LoadingMask from "../loading-mask/LoadingMask.component";
import SnackbarContainer from "../Snackbar/SnackbarContainer.component";
import appTheme from "./app.theme";

const withMuiContext = Object.assign(AppWithD2.childContextTypes, { muiTheme: PropTypes.object });

class App extends AppWithD2 {
    getChildContext() {
        return Object.assign({}, super.getChildContext(), {
            muiTheme: appTheme,
        });
    }

    render = () => {
        if (!this.state.d2) {
            return <LoadingMask />;
        }

        return (
            <React.Fragment>
                <SinglePanelLayout style={{ marginTop: 0 }}>
                    <MainContent>{this.props.children}</MainContent>
                </SinglePanelLayout>
                <SnackbarContainer />
            </React.Fragment>
        );
    };
}

App.propTypes = {
    d2: PropTypes.object,
    appConfig: PropTypes.object,
};

App.defaultProps = {
    d2: getInstance(),
};

App.childContextTypes = withMuiContext;

export default App;
