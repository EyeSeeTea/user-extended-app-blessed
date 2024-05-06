 <img height="120" src="https://github.com/EyeSeeTea/user-extended-app-blessed/blob/gh-pages/img/logo.png" alt="User-Extended App Logo">

User-Extended App is a DHIS2 Web Application part of [EyeSeeTea's DHIS2 Suite](https://eyeseetea.com/dhis2-apps/) that provides a quick, easy and integrated way to perform common operations to DHIS2 users.

[![banner_toedit](https://github.com/EyeSeeTea/user-extended-app-blessed/assets/108925044/49d54508-93f0-4c2f-8583-6f2ee9a3f1d2)](https://eyeseetea.github.io/user-extended-app-blessed/)

## Documentation

You can find a detailed user and developer guide [at the wiki](https://github.com/EyeSeeTea/user-extended-app-blessed/wiki) and also our [road map](https://github.com/orgs/EyeSeeTea/projects/47) You can download User Extended from the [DHIS2 App Hub](https://apps.dhis2.org/user/app/1bf66488-93b5-41c8-abfe-1b03b2521a2d)

For more links, see the [User-Extended App website](https://eyeseetea.github.io/user-extended-app-blessed/)

### About & Sponsorships

User-Extended App development is sustainable thanks to the partners for which we build customized DHIS2 solutions. It has been funded by the Norwegian Refugee Council, the WHO Global Malaria Programme, Samaritan’s Purse and Medecins Sans Frontières to support countries in strengthening the collection and use of health data through DHIS2. Also, the WHO Integrated Data Platform (WIDP), where several WHO departments and units share a dedicated hosting and maintenance provided by EyeSeeTea, back some specific new features. The Long Term Agreement EyeSeeTea holds with WHO for this maintenance includes maintenance of this application, ensuring that it will always work at least with the last version of WIDP. We are passionate about both DHIS2 and open source, so giving back to the community through dedicated open-source development is and will always be part of EyeSeeTea’s commitment.

You can also [support our work through a one-time contribution or becoming a regular github sponsor](https://github.com/sponsors/EyeSeeTea)

## Feedback

We’d like to hear your thoughts on the app in general, improvements, new features or any of the technologies being used. Just drop as a line at community@eyeseetea.com and let us know! If you prefer, you can also [create a new issue](https://github.com/EyeSeeTea/user-extended-app-blessed/issues) on our GitHub repository. Note that you will have to register and be logged in to GitHub to create a new issue.

## Setup

Install dependencies:

```
$ yarn install
```

## Development

Start the development server:

```
$ PORT=8081 REACT_APP_DHIS2_BASE_URL="http://localhost:8080" yarn start
```

Now in your browser, go to `http://localhost:8081`.

Notes:

-   Requests to DHIS2 will be transparently proxied (see `src/setupProxy.js`) from `http://localhost:8081/dhis2/path` to `http://localhost:8080/path` to avoid CORS and cross-domain problems.

-   The optional environment variable `REACT_APP_DHIS2_AUTH=USERNAME:PASSWORD` forces some credentials to be used by the proxy. This variable is usually not set, so the app has the same user logged in at `REACT_APP_DHIS2_BASE_URL`.

-   The optional environment variable `REACT_APP_PROXY_LOG_LEVEL` can be helpful to debug the proxyfied requests (accepts: "warn" | "debug" | "info" | "error" | "silent")

-   Create a file `.env.local` (copy it from `.env`) to customize environment variables so you can simply run `yarn start`.

-   [why-did-you-render](https://github.com/welldone-software/why-did-you-render) is installed, but it does not work when using standard react scripts (`yarn start`). Instead, use `yarn craco-start` to debug re-renders with WDYR. Note that hot reloading does not work out-of-the-box with [craco](https://github.com/gsoft-inc/craco).

## Tests

### Unit tests

```
$ yarn test
```

### Integration tests (Cypress)

Create the required users for testing (`cypress/support/App.ts`) in your instance and run:

```
$ export CYPRESS_EXTERNAL_API="http://localhost:8080"
$ export CYPRESS_ROOT_URL=http://localhost:8081

# non-interactive
$ yarn cy:e2e:run

# interactive UI
$ yarn cy:e2e:open
```

## Build app ZIP

```
$ yarn build
```

## Some development tips

### Structure

-   `i18n/`: Contains literal translations (gettext format)
-   `public/`: Main app folder with a `index.html`, exposes the APP, contains the feedback-tool.
-   `src/pages`: Main React components.
-   `src/domain`: Domain layer of the app (clean architecture)
-   `src/data`: Data of the app (clean architecture)
-   `src/components`: Reusable React components.
-   `src/types`: `.d.ts` file types for modules without TS definitions.
-   `src/utils`: Misc utilities.
-   `src/locales`: Auto-generated, do not update or add to the version control.
-   `cypress/integration/`: Cypress integration tests.

### i18n

```
$ yarn localize
```

### App context

The file `src/contexts/app-context.ts` holds some general context so typical infrastructure objects (`api`, `d2`, ...) are readily available. Add your own global objects if necessary.

### Scripts

Check the example script, entry `"script-example"`in `package.json`->scripts and `src/scripts/example.ts`.



