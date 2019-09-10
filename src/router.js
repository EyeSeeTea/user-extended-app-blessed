import React from "react";
import { Router, Route, IndexRoute, hashHistory, IndexRedirect } from "react-router";
import log from "loglevel";
import App from "./App/App.component";
import List from "./List/List.component";
import { getInstance } from "d2/lib/d2";
import listActions from "./List/list.actions";
import { initAppState, default as appState } from "./App/appStateStore";

function initState({ params }) {
    initAppState({
        sideBar: {
            currentSection: params.groupName,
            currentSubSection: params.modelType,
        },
    });
}

function loadList({ params }, replace, callback) {
    initState({ params });
    callback();
}

const routes = props => (
    <Router history={hashHistory}>
        <Route path="/" component={_props => <App {...props}>{_props.children}</App>}>
            <IndexRedirect to="list/userSection/user" />
            <Route path="list/:groupName">
                <Route path=":modelType" component={List} onEnter={loadList} disableSidebar />
            </Route>
        </Route>
    </Router>
);

export function goToRoute(url) {
    hashHistory.push(url);
}

export function goBack() {
    hashHistory.goBack();
}

export default routes;
