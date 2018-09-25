import _ from 'lodash';
import moment from 'moment';
import Papa from 'papaparse';
import { generateUid } from 'd2/lib/uid';

import { getModelValuesByField } from '../utils/dhis2Helpers';

const queryFields = [
    'displayName|rename(name)',
    'shortName',
    'firstName',
    'surname',
    'created',
    'email',
    'id',
    'userCredentials[username, userRoles[id,displayName],lastLogin]',
    'lastUpdated',
    'created',
    'displayDescription',
    'code',
    'publicAccess',
    'access',
    'href',
    'level',
    'userGroups[id,displayName,publicAccess]',
    'organisationUnits[id,displayName]',
    'dataViewOrganisationUnits[id,displayName]',
].join(",");

/*
    Limit Uids to avoid 413 Request too large
    maxUids = (maxSize - urlAndOtherParamsSize) / (uidSize + encodedCommaSize)
*/
const maxUids = (8192 - 1000) / (11 + 3);

const requiredPropertiesOnImport = ["username"];

const propertiesIgnoredOnImport = ["created", "lastUpdated", "lastLogin"];

const columnNameFromPropertyMapping = {
    id: "ID",
    name: "Name",
    firstName: "First name",
    surname: "Surname",
    email: "Email",
    username: "Username",
    userRoles: "Roles",
    lastUpdated: "Updated",
    lastLogin: "Last login",
    created: "Created",
    userGroups: "Groups",
    organisationUnits: "OUOutput",
    dataViewOrganisationUnits: "OUCapture",
    password: "Password",
    name: "Name",
    favorite: "Favorite",
    subscribed: "Subscribed",
};

const propertyFromColumnNameMapping = _.invert(columnNameFromPropertyMapping);

function buildD2Filter(filters) {
    return filters
        .map(([key, [operator, value]]) =>
            [key, operator, _.isArray(value) ? `[${_(value).take(maxUids).join(",")}]` : value].join(":"));
}

function getColumnNameFromProperty(property) {
    return columnNameFromPropertyMapping[property] || property;
}

function formatDate(stringDate) {
    return moment(stringDate).format("YYYY-MM-DD HH:mm:ss");
}

function parseDate(stringDate) {
    return moment(stringDate).toISOString();
}

function namesFromCollection(collection) {
    return (collection.toArray ? collection.toArray() : collection)
        .map(model => model.displayName)
        .join(", ");
}

function collectionFromNames(rowIndex, modelName, objectsByName, namesString) {
    const names = namesString.split(",").map(_.trim).filter(s => s);
    const missing = _.difference(names, _.keys(objectsByName));
    const warnings = _(missing).isEmpty() ? [] :
        [`[row ${rowIndex}, column ${modelName}] entries not found: ${missing.join(', ')}`];
    const objects = _(objectsByName).at(names).compact().value();
    return { objects, warnings };
}

function getPlainUser(user) {
    const userCredentials = user.userCredentials || {};

    return {
        ...user,
        username: userCredentials.username,
        lastUpdated: formatDate(user.lastUpdated),
        lastLogin: formatDate(userCredentials.lastLogin),
        created: formatDate(user.created),
        userRoles: namesFromCollection(userCredentials.userRoles),
        userGroups: namesFromCollection(user.userGroups),
        organisationUnits: namesFromCollection(user.organisationUnits),
        dataViewOrganisationUnits: namesFromCollection(user.dataViewOrganisationUnits),
    };
}

function getPlainUserFromRow(modelValuesByField, columnProperties, row, rowIndex) {
    const byName = _(modelValuesByField).mapValues(models => _.keyBy(models, "displayName")).value();
    const user = _(columnProperties)
        .zip(row)
        .map(([property, value]) => property ? [property, value] : undefined)
        .compact()
        .fromPairs()
        .value();
    const relationships = {
        userRoles: collectionFromNames(rowIndex, "userRoles", byName.userRoles, user.userRoles),
        userGroups: collectionFromNames(rowIndex, "userGroups", byName.userGroups, user.userGroups),
        organisationUnits: collectionFromNames(rowIndex, "organisationUnits",
                byName.organisationUnits, user.organisationUnits),
        dataViewOrganisationUnits: collectionFromNames(rowIndex, "dataViewOrganisationUnits",
                byName.organisationUnits, user.dataViewOrganisationUnits),
    };
    const warnings = _(relationships).values().flatMap("warnings").value();
    const objectRelationships = _(relationships).mapValues("objects").value();
    const plainUser = _(_.clone(user))
        .assign(objectRelationships)
        .omit(propertiesIgnoredOnImport)
        .omitBy(_.isUndefined)
        .value();

    return { user: plainUser, warnings };
}

async function getUsersFromCsv(d2, file, csv) {
    const [columnNames, ...rows] = csv.data;

    // Column properties can be human names (propertyFromColumnNameMapping) or direct key values
    const columnMapping = _(columnNames)
        .map(columnName => [
            columnName,
            propertyFromColumnNameMapping[columnName] ||
                (_(columnNameFromPropertyMapping).keys().includes(columnName) ? columnName : undefined)
        ])
        .fromPairs()
        .value();
    const columnProperties = _(columnMapping).values().value();
    const validColumnProperties = _(columnProperties).without(...propertiesIgnoredOnImport).value();
    const modelValuesByField = await getModelValuesByField(d2, columnProperties);
    const unknownColumns = _(columnMapping)
        .toPairs()
        .map(([columnName, property]) => !property ? columnName : undefined)
        .compact()
        .value();

    const missingProperties = _.difference(requiredPropertiesOnImport, columnProperties);

    if (!_(missingProperties).isEmpty()) {
        return {
            success: false,
            errors: [`Missing compulsory properties: ${missingProperties.join(", ")}`],
        };
    } else {
        const baseWarnings = _.compact([
            _(unknownColumns).isEmpty() ? null : `Unknown columns: ${unknownColumns.join(", ")}`,
        ]);
        const data = rows.map((row, rowIndex) => getPlainUserFromRow(modelValuesByField, columnProperties, row, rowIndex + 2));
        const users = data.map(o => o.user);
        const userWarnings = _(data).flatMap(o => o.warnings).value();
        const warnings = [...baseWarnings, ...userWarnings]

        return {
            success: true,
            users,
            columns: validColumnProperties,
            warnings,
        };
    }
}

/*
NOTE: `userGroups` is not owned property by the model User. That means that values
users[].userGroup of the metadata request are simply ignored. Therefore, we must
send the related userGroups -with the updated users- in the same request to the metadata.

Pros: Performs the whole operation in a single request, within a transaction.
Cons: Requires the current user to be able to edit those user groups.
Alternatives: We could us `/api/users/ID` or `users/ID/replica` (this copies user settings),
but that would require one request by each new user.
*/

function parseResponse(response, payload) {
    if (!response) {
        return { success: false };
    } else if (response.status !== 'OK') {
        const toArray = xs => (xs || []);
        const errors = toArray(response && response.typeReports)
            .map(typeReport => toArray(typeReport.objectReports)
                .map(objectReport => objectReport.errorReports
                    .map(errorReport => [errorReport.mainKlass, errorReport.message].join(" - "))));
        const error = uniq(flatten(flatten(errors))).join("\n");
        return { success: false, response, error, payload };
    } else {
        return { success: true };
    }
}

function getUserPayloadFromPlainAttributes(baseUser, userFields) {
    const userCredentialsFields = ["username", "password", "userRoles"];

    const userRoot = {
        ...baseUser,
        ..._(userFields).omit(userCredentialsFields).value(),
        id: baseUser.id || userFields.id,
    };

    return {
        ...userRoot,
        userCredentials: {
            ...baseUser.userCredentials,
            ..._(userFields).pick(userCredentialsFields).value(),
            id: baseUser.userCredentials && baseUser.userCredentials.id || generateUid(),
            userInfo: { id: userRoot.id },
        },
    };
}

function getUsersToSave(users, existingUsersToUpdate) {
    const usersByUsername = _.keyBy(users, "username");
    const existingUsernamesSet = new Set(existingUsersToUpdate.map(user => user.userCredentials.username));
    const usersToCreate = _(users)
        .filter(user => !existingUsernamesSet.has(user.username))
        .map(userAttributes => getUserPayloadFromPlainAttributes({}, userAttributes))
        .value();
    const usersToUpdate = existingUsersToUpdate.map(existingUser =>
        getUserPayloadFromPlainAttributes(existingUser, usersByUsername[existingUser.userCredentials.username])
    );
    return usersToCreate.concat(usersToUpdate);
}

async function getUserGroupsToSave(api, users, usersToSave, existingUsersToUpdate) {
    const userGroupsByUsername = _(users)
        .map(user => [user.username, user.userGroups.map(ug => ug.id)])
        .fromPairs()
        .value();
    const allUsers = await getExistingUsers(d2, { fields: "id,userGroups[id],userCredentials[username]" });
    const userGroupsInvolved = _(usersToSave)
        .concat(existingUsersToUpdate)
        .flatMap("userGroups")
        .uniqBy("id")
        .value();
    const usersByGroupId = _(usersToSave)
        .concat(allUsers)
        .uniqBy(user => user.userCredentials.username)
        .flatMap(user => {
            const userGroupIds = userGroupsByUsername[user.userCredentials.username] ||
                user.userGroups.map(ug => ug.id);
            return userGroupIds.map(userGroupId => ({ user, userGroupId }))
        })
        .groupBy("userGroupId")
        .mapValues(items => items.map(item => item.user))
        .value();
    const { userGroups } = await api.get("/userGroups", {
        filter: "id:in:[" + _(userGroupsInvolved).map("id").join(",") + "]",
        fields: ":owner",
        paging: false,
    });
    return userGroups.map(userGroup => ({
        ...userGroup,
        users: usersByGroupId[userGroup.id].map(user => ({ id: user.id })),
    }));
}
/* Public interface */

async function saveUsers(d2, users) {
    const api = d2.Api.getApi();
    const existingUsersToUpdate = await getExistingUsers(d2, {
        fields: ":owner,userGroups[id]",
        filter: "userCredentials.username:in:[" + _(users).map("username").join(",") + "]",
    });
    const usersToSave = getUsersToSave(users, existingUsersToUpdate);
    const userGroupsToSave = await getUserGroupsToSave(api, users, usersToSave, existingUsersToUpdate);
    const payload = { users: usersToSave, userGroups: userGroupsToSave };

    return api
        .post("metadata?importStrategy=CREATE_AND_UPDATE&mergeMode=REPLACE", payload)
        .then(res => parseResponse(res, payload))
        .catch(error => ({ success: false, error }));
}

/* Return an array of users from DHIS2 API.

    filters: Object with `field` as keys, `[operator, value]` as values.
    listOptions: Object to be passed directory to d2.models.users.list(...)
*/
function getList(d2, filters, listOptions) {
    const model = d2.models.user;
    const activeFilters = _(filters).pickBy().toPairs().value();

    /*  Filtering over nested fields (table[.table].field) in N-to-N relationships (for
        example: userCredentials.userRoles.id), fails in dhis2 < v2.30. So we need to make
        separate calls to the API for those filters and use the returned IDs to build
        the final, paginated call. */

    const [preliminarFilters, normalFilters] =
        _(activeFilters).partition(([key, opValue]) => key.match(/\./)).value();
    const preliminarD2Filters$ = preliminarFilters.map(preliminarFilter =>
        model
            .list({
                paging: false,
                fields: "id",
                filter: buildD2Filter([preliminarFilter]),
            })
            .then(collection => collection.toArray().map(obj => obj.id))
            .then(ids => `id:in:[${_(ids).take(maxUids).join(",")}]`)
    );

    return Promise.all(preliminarD2Filters$).then(preliminarD2Filters => {
        const filters = buildD2Filter(normalFilters).concat(preliminarD2Filters);

        return model.list({
            paging: true,
            fields: queryFields,
            filter: _(filters).isEmpty() ? "name:ne:default" : filters,
            ...listOptions,
        });
    });
}

/* Get users from Dhis2 API and export given columns to a CSV string */
async function exportToCsv(d2, columns, filterOptions) {
    const { filters, ...listOptions } = { ...filterOptions, paging: false };
    const users = await getList(d2, filters, listOptions);
    const userRows = users.toArray().map(user => _.at(getPlainUser(user), columns));
    const header = columns.map(getColumnNameFromProperty);
    const table = [header, ...userRows]

    return Papa.unparse(table);
}

async function importFromCsv(d2, file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            delimiter: ",",
            skipEmptyLines: true,
            trimHeaders: true,
            complete: async (csv) => {
                const res = await getUsersFromCsv(d2, file, csv);
                res.success ? resolve(res) : reject(res.errors.join("\n"));
            },
            error: (err, file) => reject(err),
        });
    });
}

async function getExistingUsers(d2, options = {}) {
    const api = d2.Api.getApi();
    const { users } = await api.get('/users', {
        paging: false,
        fields: options.fields || "id,userCredentials[username]",
        ...options,
    });
    return users;
}

export { getList, exportToCsv, importFromCsv, saveUsers, parseResponse, getExistingUsers };
