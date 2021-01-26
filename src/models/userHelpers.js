import _ from "lodash";
import _m from "../utils/lodash-mixins";
import moment from "moment";
import Papa from "papaparse";
import { generateUid } from "d2/lib/uid";

import { mapPromise, listWithInFilter } from "../utils/dhis2Helpers";

// Delimiter to use in multiple-value fields (roles, groups, orgUnits)
const fieldSplitChar = "||";

export const fieldImportSuffix = "Import";

const queryFields = [
    "displayName|rename(name)",
    "shortName",
    "firstName",
    "surname",
    "created",
    "email",
    "id",
    "userCredentials[username,disabled,userRoles[id,displayName],lastLogin]",
    "lastUpdated",
    "created",
    "displayDescription",
    "code",
    "publicAccess",
    "access",
    "href",
    "level",
    "userGroups[id,displayName,publicAccess]",
    "organisationUnits[id,code,shortName,displayName]",
    "dataViewOrganisationUnits[id,code,shortName,displayName]",
].join(",");

/*
    Limit Uids to avoid 413 Request too large
    maxUids = (maxSize - urlAndOtherParamsSize) / (uidSize + encodedCommaSize)
*/
const maxUids = (4096 - 1000) / (11 + 3);

const requiredPropertiesOnImport = ["username", "password", "firstName", "surname"];

const propertiesIgnoredOnImport = ["id", "created", "lastUpdated", "lastLogin"];

const columnsIgnoredOnExport = ["disabled"];

const userCredentialsFields = ["username", "password", "userRoles"];

const columnNameFromPropertyMapping = {
    id: "ID",
    username: "Username",
    password: "Password",
    name: "Name",
    firstName: "First name",
    surname: "Surname",
    email: "Email",
    phoneNumber: "Phone number",
    lastUpdated: "Updated",
    lastLogin: "Last login",
    created: "Created",
    userRoles: "Roles",
    userGroups: "Groups",
    organisationUnits: "OUCapture",
    dataViewOrganisationUnits: "OUOutput",
};

const propertyFromColumnNameMapping = _.invert(columnNameFromPropertyMapping);

const modelByField = {
    userRoles: "userRoles",
    userGroups: "userGroups",
    organisationUnits: "organisationUnits",
    dataViewOrganisationUnits: "organisationUnits",
};

const queryFieldsByModel = {
    userRoles: ["id", "displayName"],
    userGroups: ["id", "displayName"],
    organisationUnits: ["id", "path", "code", "displayName", "shortName"],
};

async function getAssociations(d2, objs, { orgUnitsField }) {
    const valuesByField = _(modelByField)
        .flatMap((model, _field) =>
            objs.map(obj => ({
                model,
                value: (obj[_field] || "").split(fieldSplitChar).map(s => s.trim()),
            }))
        )
        .groupBy("model")
        .mapValues(vs =>
            _(vs)
                .flatMap("value")
                .uniq()
                .compact()
                .value()
        )
        .pickBy(vs => !_(vs).isEmpty())
        .value();

    const pairs = await mapPromise(_.toPairs(valuesByField), async ([model, values]) => {
        const fields = queryFieldsByModel[model];
        const matchField = model === "organisationUnits" ? orgUnitsField : "displayName";
        // On org units, match both by shortName and displayName
        const dbFields = matchField === "shortName" ? [matchField, "displayName"] : [matchField];

        const modelsByFieldList = await Promise.all(
            dbFields.map(async dbField => {
                const listOfModels = await listWithInFilter(
                    d2.models[model],
                    dbField,
                    values,
                    { fields: fields.join(","), paging: false },
                    { useInOperator: false }
                );

                return _(listOfModels)
                    .map(model => ({ value: model[dbField], obj: _.pick(model, fields) }))
                    .value();
            })
        );
        const modelsByField = _(modelsByFieldList)
            .flatten()
            .groupBy(({ value }) => value)
            .mapValues(objs => objs.map(({ obj }) => obj))
            .value();

        return [model, modelsByField];
    });

    return _.fromPairs(pairs);
}

function buildD2Filter(filters) {
    return filters.map(([key, [operator, value]]) =>
        [
            key,
            operator,
            _.isArray(value)
                ? `[${_(value)
                      .take(maxUids)
                      .join(",")}]`
                : value,
        ].join(":")
    );
}

function getColumnNameFromProperty(property) {
    return columnNameFromPropertyMapping[property] || property;
}

function formatDate(stringDate) {
    return !!stringDate ? moment(stringDate).format("YYYY-MM-DD HH:mm:ss") : null;
}

function parseDate(stringDate) {
    return moment(stringDate).toISOString();
}

function namesFromCollection(collection, field) {
    return _(collection.toArray ? collection.toArray() : collection)
        .map(field)
        .join(fieldSplitChar);
}

function collectionFromNames(user, rowIndex, field, objectsByName) {
    const value = user[field];
    const names = (value || "")
        .split(fieldSplitChar)
        .map(_.trim)
        .filter(s => s);
    const missingValues = _.difference(names, _.keys(objectsByName));
    const { username } = user;
    const warnings = missingValues.map(
        missingValue =>
            `Value not found: ${missingValue} [username=${username ||
                "-"} csv-row=${rowIndex} csv-column=${field}]`
    );
    if (!value || !objectsByName) return { warnings };

    const data = _(names)
        .map(name => {
            const objs = _.uniqBy(objectsByName[name] || [], "id");
            return { objs, hasDuplicates: objs.length > 1 };
        })
        .compact()
        .value();

    const objects = _(data)
        .flatMap(({ objs }) => objs)
        .value();

    const info = {
        hasDuplicates: _(data).some(({ hasDuplicates }) => hasDuplicates),
    };

    return { objects, warnings, info };
}

function getPlainUser(user, { orgUnitsField }) {
    const userCredentials = user.userCredentials || {};

    return {
        ...user,
        username: userCredentials.username,
        lastUpdated: formatDate(user.lastUpdated),
        lastLogin: formatDate(userCredentials.lastLogin),
        created: formatDate(user.created),
        userRoles: namesFromCollection(userCredentials.userRoles, "displayName"),
        userGroups: namesFromCollection(user.userGroups, "displayName"),
        organisationUnits: namesFromCollection(user.organisationUnits, orgUnitsField),
        dataViewOrganisationUnits: namesFromCollection(
            user.dataViewOrganisationUnits,
            orgUnitsField
        ),
    };
}

function getPlainUserFromRow(user, modelValuesByField, rowIndex) {
    const byField = modelValuesByField;
    const relationships = {
        userRoles: collectionFromNames(user, rowIndex, "userRoles", byField.userRoles),
        userGroups: collectionFromNames(user, rowIndex, "userGroups", byField.userGroups),
        organisationUnits: collectionFromNames(
            user,
            rowIndex,
            "organisationUnits",
            byField.organisationUnits
        ),
        dataViewOrganisationUnits: collectionFromNames(
            user,
            rowIndex,
            "dataViewOrganisationUnits",
            byField.organisationUnits
        ),
    };
    const warnings = _(relationships)
        .values()
        .flatMap("warnings")
        .value();
    const objectRelationships = _(relationships)
        .mapValues("objects")
        .value();
    const extraInfo = _(relationships)
        .map(({ info }, field) => [field + fieldImportSuffix, info])
        .fromPairs()
        .value();
    const plainUser = _(_.clone(user))
        .assign(objectRelationships)
        .assign(extraInfo)
        .omit(propertiesIgnoredOnImport)
        .omitBy(_.isUndefined)
        .value();

    return { user: plainUser, warnings };
}

async function getUsersFromCsv(d2, file, csv, { maxUsers, orgUnitsField }) {
    const columnNames = _.first(csv.data);
    const rows = maxUsers
        ? _(csv.data)
              .drop(1)
              .take(maxUsers)
              .value()
        : _(csv.data)
              .drop(1)
              .value();

    const plainUserAttributes = _(d2.models.users.modelValidations)
        .map((value, key) => (_(["TEXT", "DATE", "URL"]).includes(value.type) ? key : null))
        .compact()
        .value();

    const knownColumnNames = _(columnNameFromPropertyMapping)
        .keys()
        .union(plainUserAttributes)
        .value();

    // Column properties can be human names (propertyFromColumnNameMapping) or direct key values
    const csvColumnProperties = _(columnNames)
        .map(
            columnName =>
                propertyFromColumnNameMapping[columnName] ||
                (_(knownColumnNames).includes(columnName) ? columnName : undefined)
        )
        .value();
    const columnMapping = _(columnNames)
        .zip(csvColumnProperties)
        .fromPairs()
        .value();

    // Insert password column after username if not found
    const usernameIdx = csvColumnProperties.indexOf("username");
    const columnProperties =
        !csvColumnProperties.includes("password") && usernameIdx >= 0
            ? [
                  ...csvColumnProperties.slice(0, usernameIdx + 1),
                  "password",
                  ...csvColumnProperties.slice(usernameIdx + 1),
              ]
            : csvColumnProperties;

    const validColumnProperties = _(columnProperties)
        .intersection(knownColumnNames)
        .difference(propertiesIgnoredOnImport)
        .value();

    const unknownColumns = _(columnMapping)
        .toPairs()
        .map(([columnName, property]) => (!property ? columnName : undefined))
        .compact()
        .value();

    const missingProperties = _.difference(requiredPropertiesOnImport, columnProperties);

    if (!_(missingProperties).isEmpty()) {
        return {
            success: false,
            errors: [`Missing required properties: ${missingProperties.join(", ")}`],
        };
    } else {
        const ignoredRows = csv.data.length - 1 - rows.length;
        const baseWarnings = _.compact([
            _(unknownColumns).isEmpty() ? null : `Unknown columns: ${unknownColumns.join(", ")}`,
            ignoredRows > 0 ? `maxRows=${maxUsers}, ${ignoredRows} rows ignored` : null,
        ]);
        const userRows = rows.map(row =>
            _(csvColumnProperties)
                .zip(row)
                .map(([property, value]) => (property ? [property, value] : undefined))
                .compact()
                .fromPairs()
                .value()
        );
        const modelValuesByField = await getAssociations(d2, userRows, { orgUnitsField });
        const data = userRows.map((userRow, rowIndex) =>
            getPlainUserFromRow(userRow, modelValuesByField, rowIndex + 2)
        );
        const users = data.map(o => o.user);
        const userWarnings = _(data)
            .flatMap(o => o.warnings)
            .value();
        const warnings = [...baseWarnings, ...userWarnings];

        return {
            success: true,
            users,
            columns: validColumnProperties,
            warnings,
        };
    }
}

function parseResponse(response, payload) {
    if (!response) {
        return { success: false };
    } else if (response.status !== "OK") {
        const toArray = xs => xs || [];
        const errors = toArray(response && response.typeReports).map(typeReport =>
            toArray(typeReport.objectReports).map(objectReport =>
                objectReport.errorReports.map(errorReport =>
                    [errorReport.mainKlass, errorReport.message].join(" - ")
                )
            )
        );
        const error = _(errors)
            .flatten()
            .flatten()
            .uniq()
            .join("\n");
        return { success: false, response, error, payload };
    } else {
        return { success: true, response, payload };
    }
}

function getUserPayloadFromPlainAttributes(baseUser, userFields) {
    const clean = obj => _.omitBy(obj, value => !value);

    const userRoot = {
        ...baseUser,
        ...clean(
            _(userFields)
                .omit(userCredentialsFields)
                .value()
        ),
        id: baseUser.id || userFields.id,
    };

    return {
        ...userRoot,
        userCredentials: {
            ...baseUser.userCredentials,
            ...clean(
                _(userFields)
                    .pick(userCredentialsFields)
                    .value()
            ),
            id: (baseUser.userCredentials && baseUser.userCredentials.id) || generateUid(),
            userInfo: { id: userRoot.id },
        },
    };
}

function getUsersToSave(users, existingUsersToUpdate) {
    const usersByUsername = _.keyBy(users, "username");
    const existingUsernamesSet = new Set(
        existingUsersToUpdate.map(user => user.userCredentials.username)
    );
    const usersToCreate = _(users)
        .filter(user => !existingUsernamesSet.has(user.username))
        .map(userAttributes => getUserPayloadFromPlainAttributes({}, userAttributes))
        .value();
    const usersToUpdate = existingUsersToUpdate.map(existingUser =>
        getUserPayloadFromPlainAttributes(
            existingUser,
            usersByUsername[existingUser.userCredentials.username]
        )
    );
    return usersToCreate.concat(usersToUpdate);
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

async function getUserGroupsToSave(api, usersToSave, existingUsersToUpdate) {
    const userGroupsByUsername = _(usersToSave)
        .map(user => [user.userCredentials.username, (user.userGroups || []).map(ug => ug.id)])
        .fromPairs()
        .value();
    const allUsers = await getExistingUsers(d2, {
        fields: "id,userGroups[id],userCredentials[username]",
    });
    const userGroupsInvolved = _(usersToSave)
        .concat(existingUsersToUpdate)
        .flatMap("userGroups")
        .uniqBy("id")
        .value();
    const usersByGroupId = _(usersToSave)
        .concat(allUsers)
        .uniqBy(user => user.userCredentials.username)
        .flatMap(user => {
            const userGroupIds =
                userGroupsByUsername[user.userCredentials.username] ||
                user.userGroups.map(ug => ug.id);
            return userGroupIds.map(userGroupId => ({ user, userGroupId }));
        })
        .groupBy("userGroupId")
        .mapValues(items => items.map(item => item.user))
        .value();
    const { userGroups } = await api.get("/userGroups", {
        filter:
            "id:in:[" +
            _(userGroupsInvolved)
                .map("id")
                .join(",") +
            "]",
        fields: ":owner",
        paging: false,
    });

    return userGroups.map(userGroup => ({
        ...userGroup,
        users: usersByGroupId[userGroup.id].map(user => ({ id: user.id })),
    }));
}

function postMetadata(api, payload) {
    return api
        .post("metadata?importStrategy=CREATE_AND_UPDATE&mergeMode=REPLACE", payload)
        .then(res => parseResponse(res, payload))
        .catch(error => ({
            success: false,
            payload,
            error: error ? error.message || error.toString() : "Unknown",
        }));
}

/* Public interface */

async function updateUsers(d2, users, mapper) {
    const api = d2.Api.getApi();
    const existingUsers = await getExistingUsers(d2, {
        fields: ":owner",
        filter:
            "id:in:[" +
            _(users)
                .map("id")
                .join(",") +
            "]",
    });
    const usersToSave = _(existingUsers)
        .map(mapper)
        .compact()
        .value();
    const payload = { users: usersToSave };

    return postMetadata(api, payload);
}

/* Save array of users (plain attributes), updating existing one, creating new ones */

async function saveUsers(d2, users) {
    const api = d2.Api.getApi();
    const existingUsersToUpdate = await getExistingUsers(d2, {
        fields: ":owner,userGroups[id]",
        filter:
            "userCredentials.username:in:[" +
            _(users)
                .map("username")
                .join(",") +
            "]",
    });
    const usersToSave = getUsersToSave(users, existingUsersToUpdate);
    const userGroupsToSave = await getUserGroupsToSave(api, usersToSave, existingUsersToUpdate);
    const payload = { users: usersToSave, userGroups: userGroupsToSave };

    return postMetadata(api, payload);
}

async function saveCopyInUsers(d2, users, copyUserGroups, copyUserRoles) {
    const api = d2.Api.getApi();
    const userGroupsToSave = await getUserGroupsToSave(api, users, []);
    const payload = { users: users, userGroups: userGroupsToSave };

    if (copyUserRoles && !copyUserGroups) {
        return postMetadata(api, { users: users });
    } else return postMetadata(api, payload);
}

/* Return an array of users from DHIS2 API.

    filters: Object with `field` as keys, `[operator, value]` as values.
    listOptions: Object to be passed directory to d2.models.users.list(...)
*/
function getList(d2, filters, listOptions) {
    const model = d2.models.user;
    const activeFilters = _(filters)
        .pickBy()
        .toPairs()
        .value();

    /*  Filtering over nested fields (table[.table].field) in N-to-N relationships (for
        example: userCredentials.userRoles.id), fails in dhis2 < v2.30. So we need to make
        separate calls to the API for those filters and use the returned IDs to build
        the final, paginated call. */

    const [preliminarFilters, normalFilters] = _.partition(
        activeFilters,
        ([key, [operator, value]]) => operator === "in" && key.match(/\./)
    );

    if (d2.system.version.minor >= 30) {
        const listFilters = buildD2Filter(normalFilters.concat(preliminarFilters));
        return model.list({
            paging: true,
            fields: queryFields,
            filter: _(listFilters).isEmpty() ? "name:ne:default" : listFilters,
            ...listOptions,
        });
    }

    const preliminarD2Filters$ = preliminarFilters.map(preliminarFilter =>
        model
            .list({
                paging: false,
                fields: "id",
                filter: buildD2Filter([preliminarFilter]),
            })
            .then(collection => collection.toArray().map(obj => obj.id))
            .then(
                ids =>
                    `id:in:[${_(ids)
                        .take(maxUids)
                        .join(",")}]`
            )
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
async function exportToCsv(d2, columns, filterOptions, { orgUnitsField }) {
    const { filters, ...listOptions } = { ...filterOptions, paging: false };
    const users = await getList(d2, filters, listOptions);
    const columnsToExport = _(columns)
        .without(...columnsIgnoredOnExport)
        .value();
    const userRows = users
        .toArray()
        .map(user => _.at(getPlainUser(user, { orgUnitsField }), columnsToExport));
    const header = columnsToExport.map(getColumnNameFromProperty);
    const table = [header, ...userRows];

    return Papa.unparse(table);
}

async function importFromCsv(d2, file, { maxUsers, orgUnitsField }) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            delimiter: ",",
            skipEmptyLines: true,
            trimHeaders: true,
            complete: async csv => {
                const res = await getUsersFromCsv(d2, file, csv, { maxUsers, orgUnitsField });
                res.success ? resolve(res) : reject(res.errors.join("\n"));
            },
            error: (err, file) => reject(err),
        });
    });
}

async function getExistingUsers(d2, options = {}) {
    const api = d2.Api.getApi();
    const { users } = await api.get("/users", {
        paging: false,
        fields: options.fields || "id,userCredentials[username]",
        ...options,
    });
    return users;
}

function getPayload(parentUser, destUsers, copyUserGroups, copyUserRoles, orgUnitOutput, orgUnits) {
    const users = destUsers.map(childUser => {
        let childUserRoles = childUser.userCredentials.userRoles;
        let childUserGroups = childUser.userGroups;
        let childOrgUnitOutput = childUser.dataViewOrganisationUnits;
        let childOrgUnits = childUser.organisationUnits;

        if (copyUserRoles) {
            parentUser.userCredentials.userRoles.forEach(role => {
                if (childUserRoles.find(element => element.id === role.id) === undefined) {
                    childUserRoles.push(role);
                }
            });
        }
        if (copyUserGroups) {
            parentUser.userGroups.forEach(group => {
                if (childUserGroups.find(element => element.id === group.id) === undefined) {
                    childUserGroups.push(group);
                }
            });
        }
        if (orgUnitOutput) {
            parentUser.dataViewOrganisationUnits.forEach(dataViewOrgUnit => {
                if (
                    childOrgUnitOutput.find(element => element.id === dataViewOrgUnit.id) ===
                    undefined
                ) {
                    childOrgUnitOutput.push(dataViewOrgUnit);
                }
            });
        }
        if (orgUnits) {
            parentUser.organisationUnits.forEach(dataOrgUnit => {
                if (childOrgUnits.find(element => element.id === dataOrgUnit.id) === undefined) {
                    childOrgUnits.push(dataOrgUnit);
                }
            });
        }
        return childUser;
    });
    return saveCopyInUsers(d2, users, copyUserGroups, copyUserRoles);
}

export {
    getList,
    exportToCsv,
    importFromCsv,
    updateUsers,
    saveUsers,
    parseResponse,
    getExistingUsers,
    getPayload,
};
