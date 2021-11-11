import AppWithD2 from "d2-ui/lib/app/AppWithD2.component";
import MainContent from "d2-ui/lib/layout/main-content/MainContent.component";
import SinglePanelLayout from "d2-ui/lib/layout/SinglePanel.component";
import { getInstance } from "d2/lib/d2";
import PropTypes from "prop-types";
import React from "react";
import { Observable } from "rx";
import LoadingMask from "../loading-mask/LoadingMask.component";
import SnackbarContainer from "../Snackbar/SnackbarContainer.component";
import appTheme from "./app.theme";
import appState from "./appStateStore";

const withMuiContext = Object.assign(AppWithD2.childContextTypes, { muiTheme: PropTypes.object });

class App extends AppWithD2 {
    getChildContext() {
        return Object.assign({}, super.getChildContext(), {
            muiTheme: appTheme,
        });
    }

    componentDidMount = () => {
        super.componentDidMount();

        // The all section is a special section that should not be treated like a normal section as it does not
        // have the sidebar. It is used to display the collection of all meta data objects. The all section will
        // therefore always emit false.
        const allSectionSelected$ = appState.filter(state => state.sideBar.currentSection === "all").map(() => false);

        const nonAllSectionSelected$ = appState
            // The all section is managed separately so we do not want to process those any further
            .filter(state => state.sideBar.currentSection !== "all")
            .map(state =>
                // Check if the current section is in the list of mainSections
                state.mainSections.some(mainSection => mainSection.key === state.sideBar.currentSection)
            );

        this.disposable = Observable.merge(allSectionSelected$, nonAllSectionSelected$)
            // Do not emit the value more often than needed to prevent unnecessary react triggers
            .distinctUntilChanged()
            .subscribe(hasSection =>
                this.setState({
                    ...this.state,
                    hasSection,
                })
            );
    };

    componentWillUnmount = () => {
        super.componentWillUnmount();
        this.disposable.dispose?.();
    };

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
