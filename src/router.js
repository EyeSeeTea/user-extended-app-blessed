import React from 'react';
import { Router, Route, IndexRoute, hashHistory, IndexRedirect } from 'react-router';
import log from 'loglevel';
import App from './App/App.component';
import List from './List/List.component';
import { getInstance } from 'd2/lib/d2';
import listActions from './List/list.actions';
import { initAppState, default as appState } from './App/appStateStore';

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
    return listActions.loadList(params.modelType)
        .subscribe(
            (message) => {
                log.debug(message);
                callback();
            },
            (message) => {
                if (/^.+s$/.test(params.modelType)) {
                    const nonPluralAttempt = params.modelType.substring(0, params.modelType.length - 1);
                    log.warn(`Could not find requested model type '${params.modelType}' attempting to redirect to '${nonPluralAttempt}'`);
                    replace(`list/${nonPluralAttempt}`);
                    callback();
                } else {
                    log.error('No clue where', params.modelType, 'comes from... Redirecting to app root');
                    log.error(message);

                    replace('/');
                    callback();
                }
            }
        );
}

const routes = (
    <Router history={hashHistory}>
        <Route path="/" component={App} >
            <IndexRedirect to="list/userSection/user" />        
            <Route path="list/:groupName">
                <Route
                    path=":modelType"
                    component={List}
                    onEnter={loadList}
                    disableSidebar
                />
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
