## Description

Copy organisation unit groups filtering events by program and data element answers. By default,
it filters for RDT-Training dataelement.

Logic:

- Get all org unit for the origin group.
- Exclude org unit already belonging to org unit group target.
- Iterate over all the events for the orgUnit and program, within specific dates (last x days).
- For each event, look for a data element with a specific answer (by default: RDT-trained = "1").
- Add OUs to target OU Group for all matcher organisation units.

## Setup

```
$ yarn install
```

## Run

* Run with the default configuration (uses `config.json`):

```
$ npm run start
```

* Run with some custom configuration (uses `config.json` as base configuration):

```
$ npm run start -- \
    --api:auth:username=admin \
    --api:auth:password=district \
    --fromDate="-60"
```

## Development

Check code style with ESLint:

```
$ node_modules/.bin/eslint index.js
```
