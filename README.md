# User App

User App is a Dhis2 Web Application that provides an easy and integrated way to do common operations on Dhis2 users which would be burdensome to perform using the in-built Dhis2 User management application.

## Features

- Landing page: it displays a list of users with some attributes information. The list allows sorting by some fields (click the column header) and single/multiple selections. You can also filter by name, role, groups and see only users you can manage.
- Show details:  it behaves as the regular show details in any Dhis2 instance. It shows a right side panel with some information about the user. This is also the action by default when clicking a row.
- Assign to organisation units: Implemented for single and multiple selections* allows setting Data capture and maintenance organisation units.
- Assign to organisation units output: Implemented for single and multiple selections* allows setting Data output and analysis organisation units.
- Assign roles: Implemented for single and multiple selections* allows assigning the roles to a user/s.
- Assign to groups: Implemented for single and multiple selections* allows assigning the user groups for a user/s.
- Shortcut to regular dhis2 user management app

*In single mode, it works as the regular Dhis2 vanilla feature. For multiple selections, the changes can be saved using one of two strategies: merge or replace. The merge strategy will add the selected entities to the current values each user had, no values will b

## Installation

Just download the [zip file available for each release](https://github.com/EyeSeeTea/user-app-blessed/releases) and install it in your Dhis2 instance using the App management application.

## Feedback

We’d like to hear your thoughts on the app in general, improvements, new features or any of the technologies being used. Just drop as a line at hello@eyeseetea.com and let us know! If you prefer, you can also create a new issue on our GitHub repository. Note that you will have to register and be logged in to GitHub to create a new issue.

## License

This app is licensed under GPLv3. Please respect the terms of that license.
