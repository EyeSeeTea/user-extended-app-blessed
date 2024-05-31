import _ from "lodash";
import moment from "moment";
import Papa from "papaparse";
import i18n from "../../locales";

import { FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { ListOptions, UserRepository } from "../repositories/UserRepository";

import { UseCase } from "../../CompositionRoot";
// import { mapPromise, listWithInFilter } from "../../legacy/utils/dhis2Helpers";
// import { getUserList } from "../../legacy/models/userList";
// import { columns } from "../../legacy/List/list.store";
// import { generateUid } from "../../utils/uid";

// Constants
const fieldSplitChar = "||";
// const fieldImportSuffix = "Import";
// const requiredPropertiesOnImport = ["username", "password", "firstName", "surname", "userRoles"];
// const propertiesIgnoredOnImport = ["id", "created", "lastUpdated", "lastLogin"];
// const userCredentialsFields = ["username", "password", "userRoles", "disabled", "openId"];
// const user238MissingFields = ["username", "userRoles", "disabled", "openId", "password"];

const columnNameFromPropertyMapping = {
    id: i18n.t("ID"),
    username: i18n.t("Username"),
    password: i18n.t("Password"),
    name: i18n.t("Name"),
    firstName: i18n.t("First name"),
    surname: i18n.t("Surname"),
    email: i18n.t("Email"),
    phoneNumber: i18n.t("Phone number"),
    lastUpdated: i18n.t("Updated"),
    lastLogin: i18n.t("Last login"),
    created: i18n.t("Created"),
    userRoles: i18n.t("Roles"),
    userGroups: i18n.t("Groups"),
    organisationUnits: i18n.t("OUCapture"),
    dataViewOrganisationUnits: i18n.t("OUOutput"),
    searchOrganisationsUnits: i18n.t("OUSearch"),
    disabled: i18n.t("Disabled"),
    openId: i18n.t("Open ID"),
};

// const propertyFromColumnNameMapping = _.invert(columnNameFromPropertyMapping);
// const modelByField: Record<string, string> = {
//     userRoles: "userRoles",
//     userGroups: "userGroups",
//     organisationUnits: "organisationUnits",
//     dataViewOrganisationUnits: "organisationUnits",
//     searchOrganisationsUnits: "organisationUnits",
// };

// const queryFieldsByModel: Record<string, string[]> = {
//     userRoles: ["id", "displayName"],
//     userGroups: ["id", "displayName"],
//     organisationUnits: ["id", "path", "code", "displayName", "shortName"],
// };

export class ExportUsersUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute({ filterOptions, ...options }: ExportUsersUseCaseOptions): FutureData<Promise<string>> {
        return this.userRepository.listAll(filterOptions).map(users => {
            console.log("users.length", users.length);
            return this.exportUsers(users, options);
        });
    }

    private async exportUsers(
        users: User[],
        { columns, orgUnitsField, format }: Pick<ExportUsersUseCaseOptions, "columns" | "orgUnitsField" | "format">
    ) {
        switch (format) {
            case "json": {
                const userRows = users.map(user => _.pick(this.getPlainUser(user, orgUnitsField, true), columns));
                return JSON.stringify(userRows, null, 4);
            }
            case "csv": {
                const userRows = users.map(user => _.at(this.getPlainUser(user, orgUnitsField, false), columns));
                const header = columns.map(this.getColumnNameFromProperty);
                const table = [header, ...userRows];

                return Papa.unparse(table);
            }
        }
    }

    private getColumnNameFromProperty(property: ColumnMappingKeys): string {
        return columnNameFromPropertyMapping[property] || property;
    }

    private formatDate(stringDate: string | null): string | null {
        return stringDate ? moment(stringDate).format("YYYY-MM-DD HH:mm:ss") : null;
    }

    private namesFromCollection(collection: any, field: string, toArray: boolean): any {
        const namesArray = _(collection?.toArray ? collection.toArray() : collection).map(field);

        return toArray ? namesArray : namesArray.join(fieldSplitChar);
    }

    private getPlainUser(user: any, orgUnitsField: string, toArray: boolean): any {
        const userCredentials = user.userCredentials || {};

        return {
            ...user,
            username: userCredentials.username,
            lastUpdated: this.formatDate(user.lastUpdated),
            lastLogin: this.formatDate(userCredentials.lastLogin),
            created: this.formatDate(user.created),
            userRoles: this.namesFromCollection(userCredentials.userRoles, "displayName", toArray),
            userGroups: this.namesFromCollection(user.userGroups, "displayName", toArray),
            organisationUnits: this.namesFromCollection(user.organisationUnits, orgUnitsField, toArray),
            dataViewOrganisationUnits: this.namesFromCollection(user.dataViewOrganisationUnits, orgUnitsField, toArray),
            searchOrganisationsUnits: this.namesFromCollection(user.teiSearchOrganisationUnits, orgUnitsField, toArray),
            disabled: userCredentials.disabled,
            openId: userCredentials.openId,
            phoneNumber: user.phoneNumber,
        };
    }
    // private async getAssociations(objs: any[], orgUnitsField: string) {
    //     const valuesByField = _(modelByField)
    //         .flatMap((model, _field) =>
    //             objs.map(obj => ({
    //                 model,
    //                 value: (obj[_field] || "").split(fieldSplitChar).map(s => s.trim()),
    //             }))
    //         )
    //         .groupBy("model")
    //         .mapValues(vs => _(vs).flatMap("value").uniq().compact().value())
    //         .pickBy(vs => !_(vs).isEmpty())
    //         .value();

    //     const pairs = await mapPromise(_.toPairs(valuesByField), async ([model, values]) => {
    //         const fields = queryFieldsByModel[model];
    //         const matchField = model === "organisationUnits" ? orgUnitsField : "displayName";
    //         const dbFields = matchField === "shortName" ? [matchField, "displayName"] : [matchField];

    //         const modelsByFieldList = await Promise.all(
    //             dbFields.map(async dbField => {
    //                 const listOfModels = await listWithInFilter(
    //                     this.d2.models[model],
    //                     dbField,
    //                     values,
    //                     { fields: fields.join(","), paging: false },
    //                     { useInOperator: true }
    //                 );

    //                 return _(listOfModels)
    //                     .map(model => ({ value: model[dbField], obj: _.pick(model, fields) }))
    //                     .value();
    //             })
    //         );
    //         const modelsByField = _(modelsByFieldList)
    //             .flatten()
    //             .groupBy(({ value }) => value)
    //             .mapValues(objs => objs.map(({ obj }) => obj))
    //             .value();

    //         return [model, modelsByField];
    //     });

    //     return _.fromPairs(pairs);
    // }

    // private getPlainUserFromRow(user: any, modelValuesByField: any, rowIndex: number): any {
    //     const byField = modelValuesByField;
    //     const relationships = {
    //         userRoles: this.collectionFromNames(user, rowIndex, "userRoles", byField.userRoles),
    //         userGroups: this.collectionFromNames(user, rowIndex, "userGroups", byField.userGroups),
    //         organisationUnits: this.collectionFromNames(user, rowIndex, "organisationUnits", byField.organisationUnits),
    //         dataViewOrganisationUnits: this.collectionFromNames(
    //             user,
    //             rowIndex,
    //             "dataViewOrganisationUnits",
    //             byField.organisationUnits
    //         ),
    //         searchOrganisationsUnits: this.collectionFromNames(
    //             user,
    //             rowIndex,
    //             "searchOrganisationsUnits",
    //             byField.organisationUnits
    //         ),
    //     };
    //     const warnings = _(relationships).values().flatMap("warnings").value();
    //     const objectRelationships = _(relationships).mapValues("objects").value();
    //     const extraInfo = _(relationships)
    //         .map(({ info }, field) => [field + fieldImportSuffix, info])
    //         .fromPairs()
    //         .value();
    //     const plainUser = _(_.clone(user))
    //         .assign(objectRelationships)
    //         .assign(extraInfo)
    //         .omit(propertiesIgnoredOnImport)
    //         .omitBy(_.isUndefined)
    //         .value();

    //     return { user: plainUser, warnings };
    // }

    // private async getUsersFromCsv(file: File, csv: any, maxUsers: number, orgUnitsField: string) {
    //     const columnNames = _.first(csv.data);
    //     const rows = maxUsers ? _(csv.data).drop(1).take(maxUsers).value() : _(csv.data).drop(1).value();

    //     const plainUserAttributes = _(this.d2.models.users.modelValidations)
    //         .map((value, key) => (_(["TEXT", "DATE", "URL"]).includes(value.type) ? key : null))
    //         .compact()
    //         .value();

    //     const knownColumnNames = _(columnNameFromPropertyMapping).keys().union(plainUserAttributes).value();

    //     // Column properties can be human names (propertyFromColumnNameMapping) or direct key values
    //     const csvColumnProperties = _(columnNames)
    //         .map(
    //             columnName =>
    //                 propertyFromColumnNameMapping[columnName] ||
    //                 (_(knownColumnNames).includes(columnName) ? columnName : undefined)
    //         )
    //         .value();
    //     const columnMapping = _(columnNames).zip(csvColumnProperties).fromPairs().value();

    //     // Insert password column after username if not found
    //     const usernameIdx = csvColumnProperties.indexOf("username");
    //     const columnProperties =
    //         !csvColumnProperties.includes("password") && usernameIdx !== -1
    //             ? _(csvColumnProperties)
    //                   .take(usernameIdx + 1)
    //                   .concat("password")
    //                   .concat(_(csvColumnProperties).drop(usernameIdx + 1))
    //                   .value()
    //             : csvColumnProperties;

    //     const columnMappingWithPasswords =
    //         !_(columnMapping).has("password") && _(columnMapping).has("username")
    //             ? { ...columnMapping, password: "Password" }
    //             : columnMapping;

    //     const users = _(rows)
    //         .map(row => _.zipObject(columnProperties, row))
    //         .reject(user => _.isEmpty(user.username))
    //         .value();

    //     const valuesByField = _(users)
    //         .flatMap(user => _(modelByField).map((model, field) => ({ field, model, values: user[field] || [] })))
    //         .groupBy("model")
    //         .mapValues(items =>
    //             _(items)
    //                 .flatMap(({ values }) => values.split(fieldSplitChar).map(_.trim))
    //                 .uniq()
    //                 .compact()
    //                 .value()
    //         )
    //         .value();

    //     const associations = await this.getAssociations(valuesByField);

    //     const plainUsers = _(users)
    //         .map((user, index) => this.getPlainUserFromRow(user, associations, index))
    //         .value();

    //     const warnings = _(plainUsers).flatMap("warnings").value();
    //     const validUsers = _(plainUsers).map("user").value();

    //     return { users: validUsers, warnings, columnMapping: columnMappingWithPasswords };
    // }

    // public async importUsers(file: File, maxUsers: number = 100, orgUnitsField: string = "shortName") {
    //     return new Promise((resolve, reject) => {
    //         Papa.parse(file, {
    //             complete: async (csv: any) => {
    //                 try {
    //                     const result = await this.getUsersFromCsv(file, csv, maxUsers, orgUnitsField);
    //                     resolve(result);
    //                 } catch (error) {
    //                     reject(error);
    //                 }
    //             },
    //             header: true,
    //         });
    //     });
    // }
}

export type ColumnMappingKeys = keyof typeof columnNameFromPropertyMapping;

export type ExportUsersUseCaseOptions = {
    columns: ColumnMappingKeys[];
    filterOptions: ListOptions;
    orgUnitsField: any; // TODO type
    format: "json" | "csv";
};
