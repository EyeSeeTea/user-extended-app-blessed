import _ from "lodash";
import Papa from "papaparse";
import { generateUid } from "d2/lib/uid";

import { mapPromise, listWithInFilter } from "../utils/dhis2Helpers";
import { UserD2ApiRepository } from "../../data/repositories/UserD2ApiRepository";
import { buildUserWithoutPassword } from "../../data/utils";
import { D2ApiLogger } from "../../data/D2ApiLogger";

// Delimiter to use in multiple-value fields (roles, groups, orgUnits)
const fieldSplitChar = "||";

export const fieldImportSuffix = "Import";

// NOTE: UEApp allows to create a user without organisationUnits, but DHIS2 User App does not.
const requiredPropertiesOnImport = ["username", "password", "firstName", "surname", "userRoles", "organisationUnits"];

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
    searchOrganisationsUnits: "OUSearch",
    disabled: "Disabled",
    openId: "Open ID",
};

const propertyFromColumnNameMapping = _.invert(columnNameFromPropertyMapping);

const modelByField = {
    userRoles: "userRoles",
    userGroups: "userGroups",
    organisationUnits: "organisationUnits",
    dataViewOrganisationUnits: "organisationUnits",
    searchOrganisationsUnits: "organisationUnits",
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
        searchOrganisationsUnits: collectionFromNames(
            user,
            rowIndex,
            "searchOrganisationsUnits",
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

function parseResponse(response, payload, logger) {
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
        logger?.log({ error: error });
        return { success: false, response, error, payload };
    } else {
        logger?.log(response);
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
        teiSearchOrganisationUnits: userRoot.searchOrganisationsUnits,
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

    const userGroupsInvolved = _(usersToSave).concat(existingUsersToUpdate).flatMap("userGroups").uniqBy("id").value();
    const usersByGroupId = _(usersToSave)
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

    return userGroups.map(userGroup => {
        const usersByGroup = _(usersByGroupId[userGroup.id])
            .map(user => ({ id: user.id }))
            .value();
        return { ...userGroup, users: _(userGroup.users).concat(usersByGroup).value() };
    });
}

function postMetadata(api, payload, logger) {
    return api
        .post("metadata?importStrategy=CREATE_AND_UPDATE&mergeMode=REPLACE", payload)
        .then(res => parseResponse(res, payload, logger))
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

async function getUserGroupsToSaveAndPostMetadata(d2, api, users, existingUsersToUpdate, d2Api, currentUser) {
    const userGroupsToSave = await getUserGroupsToSave(d2, api, users, existingUsersToUpdate);
    const payload = { users: users, userGroups: userGroupsToSave };
    if (d2Api && currentUser) {
        const d2ApiTracker = new D2ApiLogger(d2Api);
        const { data: d2Logger } = await d2ApiTracker.buildLogger(currentUser).runAsync();
        d2Logger?.log({ users: buildUserWithoutPassword(users), userGroups: userGroupsToSave });
        return postMetadata(api, payload, d2Logger);
    } else {
        return postMetadata(api, payload, undefined);
    }
}

/* Save array of users (plain attributes), updating existing one, creating new ones */
async function saveUsers(d2, users, d2Api, currentUser) {
    const api = d2.Api.getApi();
    const userRepository = new UserD2ApiRepository({ url: d2Api.baseUrl });
    const existingUsersToUpdate = await getExistingUsers(d2, {
        fields: ":owner,userCredentials,userGroups[id]",
        filter: "userCredentials.username:in:[" + _(users).map("username").join(",") + "]",
    });
    const usersToSave = getUsersToSave(users, existingUsersToUpdate);
    const d2Logger = await buildLogger(d2Api, currentUser);
    d2Logger?.log({ users: buildUserWithoutPassword(users) });
    const response = await postMetadata(api, { users: users }, d2Logger);
    // NOTE: this executes even when postMetadata fails
    await userRepository.updateUserGroups(usersToSave, existingUsersToUpdate, d2Logger).runAsync();
    return response;
}

async function buildLogger(d2Api, currentUser) {
    if (!d2Api || !currentUser) return undefined;

    const d2ApiTracker = new D2ApiLogger(d2Api);
    const { data: d2Logger } = await d2ApiTracker.buildLogger(currentUser).runAsync();
    return d2Logger;
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
        obj.searchOrganisationsUnits = obj.searchOrganisationsUnits?.join("||");
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
        v: +new Date().getTime(),
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

        const newChildOrgUnitsSearch = addItems(
            childUser.searchOrganisationsUnits,
            parentUser.searchOrganisationsUnits,
            fields.orgUnitSearch,
            updateStrategy
        );

        return {
            ...childUser,
            userCredentials: newChildUserCredentials,
            userGroups: newChildUserGroups,
            dataViewOrganisationUnits: newChildOrgUnitsOutput,
            searchOrganisationsUnits: newChildOrgUnitsSearch,
            organisationUnits: newChildOrgUnits,
        };
    });

    return saveCopyInUsers(d2, users, fields.userGroups);
}

export {
    importFromCsv,
    importFromJson,
    updateUsers,
    saveUsers,
    parseResponse,
    getExistingUsers,
    getPayload,
    postMetadata,
};
