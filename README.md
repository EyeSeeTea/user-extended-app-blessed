# User App

User management web application for DHIS2 servers


## Installation for developers


- Clone [d2-ui](https://github.com/EyeSeeTea/d2-ui) repo
- Change to 2.27-org_unit_intersection_policy branch
- npm install 
- npm build-only
- npm link

- Clone this repo
- npm install
- Delete node_modules/d2-ui
- npm link d2-ui
- npm install
- Create config.js file from config.template.js. Add server settings
- npm start
