const dhisDevConfig = DHIS_CONFIG; // eslint-disable-line
if (process.env.NODE_ENV !== 'production') {
    jQuery.ajaxSetup({ headers: { Authorization: dhisDevConfig.authorization } }); // eslint-disable-line
}

Error.stackTraceLimit = Infinity;

import React from 'react';
import { render } from 'react-dom';
import { init, config, getUserSettings, getManifest } from 'd2/lib/d2';
import log from 'loglevel';
import LoadingMask from './loading-mask/LoadingMask.component';
import routes from './router';
import appTheme from './App/app.theme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import Api from 'd2/lib/api/Api';
import '../scss/app.scss';

if (process.env.NODE_ENV !== 'production') {
    log.setLevel(log.levels.DEBUG);
} else {
    log.setLevel(log.levels.INFO);
}

function configI18n(userSettings) {
    const uiLocale = userSettings.keyUiLocale;

    if (uiLocale && uiLocale !== 'en') {
        // Add the language sources for the preferred locale
        config.i18n.sources.add(`./i18n/i18n_module_${uiLocale}.properties`);
    }

    // Add english as locale for all cases (either as primary or fallback)
    config.i18n.sources.add('./i18n/i18n_module_en.properties');
}

function getAppConfig(d2) {
    const api = new Api().setBaseUrl('');
    return api.get('app-config.json')
        .then(appConfig => ({d2, appConfig}))
        .catch(err => ({d2}));
}

function startApp(options) {
    const { d2, appConfig } = options;
    window.d2 = d2; // Make d2 available in the console
    render(routes({appConfig}), document.getElementById('app'));
}

render(<MuiThemeProvider muiTheme={appTheme}><LoadingMask /></MuiThemeProvider>,
    document.getElementById('app'));

getManifest('./manifest.webapp')
    .then(manifest => {
        const isProduction = process.env.NODE_ENV === 'production';
        const baseUrl = isProduction ? manifest.getBaseUrl() : dhisDevConfig.baseUrl;
        config.baseUrl = `${baseUrl}/api`;
        if (!isProduction) config.headers = { Authorization: dhisDevConfig.authorization }
        log.info(`Loading: ${manifest.name} v${manifest.version}`);
        log.info(`Built ${manifest.manifest_generated_at}`);
    })
    .then(getUserSettings)
    .then(configI18n)
    .then(init)
    .then(getAppConfig)
    .then(startApp)
    .catch(log.error.bind(log));
