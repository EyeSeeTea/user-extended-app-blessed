= Description

The attribute _attributeCategoryOptions_ for program events may not hold the correct value. This script fixes this value for some configured programs and date range (see `config.json`). 

For each existing event, the script takes the _storedBy_ attribute from the first _dataValue_ and sets its corresponding _categoryOptionId_ . 

= Setup

```
$ cd src/scripts/fix-program-events-user
$ npm install
```

= Run

* Run with the default configuration (uses `config.json`):

```
$ npm run start
```

* Run with some custom configuration (uses `config.json` as base configuration):

```
$ npm run start -- \
    --api:auth:username=admin \
    --api:auth:password=district
    --fromDate="-60" \
    --programs=dfger232W \
    --programs=r342WEF22
```

= Development

Check code style with ESLint:

```
$ node_modules/.bin/eslint index.js
```
