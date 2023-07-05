import _ from "lodash";
import moment from "moment";
import Papa from "papaparse";
import { generateUid } from "d2/lib/uid";

import { mapPromise, listWithInFilter } from "../utils/dhis2Helpers";
import { getUserList } from "./userList";
import { columns } from "../List/list.store";

// Delimiter to use in multiple-value fields (roles, groups, orgUnits)
const fieldSplitChar = "||";

export const fieldImportSuffix = "Import";

const requiredPropertiesOnImport = ["username", "password", "firstName", "surname"];

const propertiesIgnoredOnImport = ["id", "created", "lastUpdated", "lastLogin"];

const userCredentialsFields = ["username", "password", "userRoles", "disabled", "openId"];

const user238MissingFields = ["username", "userRoles", "disabled", "openId", "password"];

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
    disabled: "Disabled",
    openId: "Open ID",
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
        .mapValues(vs => _(vs).flatMap("value").uniq().compact().value())
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
                    { useInOperator: true }
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

function getColumnNameFromProperty(property) {
    return columnNameFromPropertyMapping[property] || property;
}

function formatDate(stringDate) {
    return stringDate ? moment(stringDate).format("YYYY-MM-DD HH:mm:ss") : null;
}

function namesFromCollection(collection, field, toArray) {
    const namesArray = _(collection?.toArray ? collection.toArray() : collection).map(field);

    if (toArray) {
        return namesArray;
    } else {
        return namesArray.join(fieldSplitChar);
    }
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
            `Value not found: ${missingValue} [username=${username || "-"} csv-row=${rowIndex} csv-column=${field}]`
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

function getPlainUser(user, { orgUnitsField }, toArray) {
    const userCredentials = user.userCredentials || {};

    return {
        ...user,
        username: userCredentials.username,
        lastUpdated: formatDate(user.lastUpdated),
        lastLogin: formatDate(userCredentials.lastLogin),
        created: formatDate(user.created),
        userRoles: namesFromCollection(userCredentials.userRoles, "displayName", toArray),
        userGroups: namesFromCollection(user.userGroups, "displayName", toArray),
        organisationUnits: namesFromCollection(user.organisationUnits, orgUnitsField, toArray),
        dataViewOrganisationUnits: namesFromCollection(user.dataViewOrganisationUnits, orgUnitsField, toArray),
        disabled: userCredentials.disabled,
        openId: userCredentials.openId,
    };
}

function getPlainUserFromRow(user, modelValuesByField, rowIndex) {
    const byField = modelValuesByField;
    const relationships = {
        userRoles: collectionFromNames(user, rowIndex, "userRoles", byField.userRoles),
        userGroups: collectionFromNames(user, rowIndex, "userGroups", byField.userGroups),
        organisationUnits: collectionFromNames(user, rowIndex, "organisationUnits", byField.organisationUnits),
        dataViewOrganisationUnits: collectionFromNames(
            user,
            rowIndex,
            "dataViewOrganisationUnits",
            byField.organisationUnits
        ),
    };
    const warnings = _(relationships).values().flatMap("warnings").value();
    const objectRelationships = _(relationships).mapValues("objects").value();
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
    const rows = maxUsers ? _(csv.data).drop(1).take(maxUsers).value() : _(csv.data).drop(1).value();

    const plainUserAttributes = _(d2.models.users.modelValidations)
        .map((value, key) => (_(["TEXT", "DATE", "URL"]).includes(value.type) ? key : null))
        .compact()
        .value();

    const knownColumnNames = _(columnNameFromPropertyMapping).keys().union(plainUserAttributes).value();

    // Column properties can be human names (propertyFromColumnNameMapping) or direct key values
    const csvColumnProperties = _(columnNames)
        .map(
            columnName =>
                propertyFromColumnNameMapping[columnName] ||
                (_(knownColumnNames).includes(columnName) ? columnName : undefined)
        )
        .value();
    const columnMapping = _(columnNames).zip(csvColumnProperties).fromPairs().value();

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
        const users = data.map(o => {
            const disableStr = (o.user.disabled || "").toLowerCase();
            return { ...o.user, disabled: disableStr === "true" };
        });
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
                objectReport.errorReports.map(errorReport => [errorReport.mainKlass, errorReport.message].join(" - "))
            )
        );
        const error = _(errors).flatten().flatten().uniq().join("\n");
        return { success: false, response, error, payload };
    } else {
        return { success: true, response, payload };
    }
}

function getUserPayloadFromPlainAttributes(baseUser, userFields) {
    const clean = obj => _.omitBy(obj, value => value === undefined || value === null);

    const userRoot = {
        ...baseUser,
        ...clean(_(userFields).omit(userCredentialsFields).value()),
        id: baseUser.id || userFields.id,
    };

    return {
        ...userRoot,
        userCredentials: {
            ...baseUser.userCredentials,
            ...clean(_(userFields).pick(userCredentialsFields).value()),
            id: (baseUser.userCredentials && baseUser.userCredentials.id) || generateUid(),
            userInfo: { id: userRoot.id },
        },
        ...clean(_(userFields).pick(user238MissingFields).value()),
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

/*
NOTE: `userGroups` is not owned property by the model User. That means that values
users[].userGroup of the metadata request are simply ignored. Therefore, we must
send the related userGroups -with the updated users- in the same request to the metadata.

Pros: Performs the whole operation in a single request, within a transaction.
Cons: Requires the current user to be able to edit those user groups.
Alternatives: We could us `/api/users/ID` or `users/ID/replica` (this copies user settings),
but that would require one request by each new user.
*/

async function getUserGroupsToSave(d2, api, usersToSave, existingUsersToUpdate) {
    const userGroupsByUsername = _(usersToSave)
        .map(user => [user.userCredentials.username, (user.userGroups || []).map(ug => ug.id)])
        .fromPairs()
        .value();
    const allUsers = await getExistingUsers(d2, {
        fields: "id,userGroups[id],userCredentials[username]",
    });
    const userGroupsInvolved = _(usersToSave).concat(existingUsersToUpdate).flatMap("userGroups").uniqBy("id").value();
    const usersByGroupId = _(usersToSave)
        .concat(allUsers)
        .uniqBy(user => user.userCredentials.username)
        .flatMap(user => {
            const userGroupIds =
                userGroupsByUsername[user.userCredentials.username] || user.userGroups.map(ug => ug.id);
            return userGroupIds.map(userGroupId => ({ user, userGroupId }));
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
        fields: ":owner,userCredentials",
        filter: "id:in:[" + _(users).map("id").join(",") + "]",
    });
    const usersToSave = _(existingUsers).map(mapper).compact().value();
    const payload = { users: usersToSave };

    return postMetadata(api, payload);
}

async function getUserGroupsToSaveAndPostMetadata(d2, api, users, existingUsersToUpdate) {
    const userGroupsToSave = await getUserGroupsToSave(d2, api, users, existingUsersToUpdate);
    const payload = { users: users, userGroups: userGroupsToSave };
    return postMetadata(api, payload);
}

/* Save array of users (plain attributes), updating existing one, creating new ones */
async function saveUsers(d2, users) {
    const api = d2.Api.getApi();
    const existingUsersToUpdate = await getExistingUsers(d2, {
        fields: ":owner,userCredentials,userGroups[id]",
        filter: "userCredentials.username:in:[" + _(users).map("username").join(",") + "]",
    });
    const usersToSave = getUsersToSave(users, existingUsersToUpdate);
    return getUserGroupsToSaveAndPostMetadata(d2, api, usersToSave, existingUsersToUpdate);
}

async function saveCopyInUsers(d2, users, copyUserGroups) {
    const api = d2.Api.getApi();
    if (copyUserGroups) {
        const existingUsersToUpdate = await getExistingUsers(d2, {
            fields: ":owner,userCredentials,userGroups[id]",
            filter: "userCredentials.username:in:[" + _(users).map("userCredentials.username").join(",") + "]",
        });
        return getUserGroupsToSaveAndPostMetadata(d2, api, users, existingUsersToUpdate);
    } else {
        return postMetadata(api, { users: users });
    }
}

/* Get users from Dhis2 API and export given columns to a CSV or JSON string */
async function exportUsers(d2, columns, filterOptions, { orgUnitsField }, exportToJSON) {
    const { filters, ...listOptions } = { ...filterOptions, pageSize: 1e6 };
    const { users } = await getUserList(d2, filters, listOptions);

    if (exportToJSON) {
        const userRows = users.map(user => _.pick(getPlainUser(user, { orgUnitsField }, exportToJSON), columns));
        return JSON.stringify(userRows, null, 4);
    } else {
        const userRows = users.map(user => _.at(getPlainUser(user, { orgUnitsField }, exportToJSON), columns));
        const header = columns.map(getColumnNameFromProperty);
        const table = [header, ...userRows];

        return Papa.unparse(table);
    }
}

async function exportTemplateToCsv() {
    const columnsAdded = ["password"];
    const columnsRemoved = ["lastUpdated", "created", "lastLogin"];
    const columnKeysToExport = _(columns)
        .map(column => column.name)
        .difference(columnsRemoved)
        .union(columnsAdded)
        .value();
    const header = _(columnKeysToExport).map(getColumnNameFromProperty).compact().value();
    const table = [header];

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
            error: err => reject(err),
        });
    });
}

async function importFromJson(d2, file, { maxUsers, orgUnitsField }) {
    const jsonText = await new Response(file).text();
    let jsonObject = JSON.parse(jsonText);

    jsonObject.forEach(obj => {
        obj.userRoles = obj.userRoles?.join("||");
        obj.userGroups = obj.userGroups?.join("||");
        obj.organisationUnits = obj.organisationUnits?.join("||");
        obj.dataViewOrganisationUnits = obj.dataViewOrganisationUnits?.join("||");
    });

    const csvText = Papa.unparse(jsonObject, { delimiter: "," });
    const response = await importFromCsv(d2, csvText, { maxUsers, orgUnitsField });
    const jsonWarnings = csvWarningsToJsonWarning(response.warnings);

    return { ...response, warnings: jsonWarnings };
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

function csvWarningsToJsonWarning(warnings) {
    return warnings.map(warning => {
        return `${warning}`.replace(/csv-row=\d+ /, "").replace("csv-column", "json-key");
    });
}

function addItems(items1, items2, shouldAdd, updateStrategy) {
    if (!shouldAdd) {
        return items1;
    } else {
        return updateStrategy === "merge"
            ? _(items1)
                  .unionBy(items2, element => element.id)
                  .value()
            : items2;
    }
}

function getPayload(d2, parentUser, destUsers, fields, updateStrategy) {
    const users = destUsers.map(childUser => {
        const newChildUserCredentials = {
            ...childUser.userCredentials,
            userRoles: addItems(
                childUser.userCredentials.userRoles,
                parentUser.userCredentials.userRoles,
                fields.userRoles,
                updateStrategy
            ),
        };

        const newChildUserGroups = addItems(
            childUser.userGroups,
            parentUser.userGroups,
            fields.userGroups,
            updateStrategy
        );

        const newChildOrgUnitsOutput = addItems(
            childUser.dataViewOrganisationUnits,
            parentUser.dataViewOrganisationUnits,
            fields.orgUnitOutput,
            updateStrategy
        );

        const newChildOrgUnits = addItems(
            childUser.organisationUnits,
            parentUser.organisationUnits,
            fields.orgUnitCapture,
            updateStrategy
        );

        return {
            ...childUser,
            userCredentials: newChildUserCredentials,
            userGroups: newChildUserGroups,
            dataViewOrganisationUnits: newChildOrgUnitsOutput,
            organisationUnits: newChildOrgUnits,
        };
    });

    return saveCopyInUsers(d2, users, fields.userGroups);
}

export {
    exportTemplateToCsv,
    importFromCsv,
    exportUsers,
    importFromJson,
    updateUsers,
    saveUsers,
    parseResponse,
    getExistingUsers,
    getPayload,
    postMetadata,
};
