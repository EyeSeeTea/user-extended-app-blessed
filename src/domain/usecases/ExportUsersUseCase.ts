import _ from "lodash";
import moment from "moment";
import Papa from "papaparse";
import i18n from "../../locales";

import { Future, FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { ListOptions, UserRepository } from "../repositories/UserRepository";
import { OrgUnitKey } from "../entities/OrgUnit";

const fieldSplitChar = "||";
const defaultNameField = "name";
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
    apiUrl: i18n.t("API URL"),
    created: i18n.t("Created"),
    userRoles: i18n.t("Roles"),
    userGroups: i18n.t("Groups"),
    organisationUnits: i18n.t("OUCapture"),
    dataViewOrganisationUnits: i18n.t("OUOutput"),
    searchOrganisationsUnits: i18n.t("OUSearch"),
    disabled: i18n.t("Disabled"),
    status: i18n.t("Status"),
    openId: i18n.t("Open ID"),
    createdBy: i18n.t("Created by"),
    lastModifiedBy: i18n.t("Last modified by"),
};

export class ExportUsersUseCase {
    constructor(private userRepository: UserRepository) {}

    public execute({
        filterOptions = {},
        isEmptyTemplate,
        ...options
    }: ExportUsersUseCaseOptions): FutureData<{ blob: Blob; filename: string }> {
        if (isEmptyTemplate) {
            return Future.success(this.buildBlobAndFilename([], options));
        }
        return this.userRepository.listAll(filterOptions).map(users => {
            return this.buildBlobAndFilename(users, options);
        });
    }

    private getFilename({ name, format }: ExportUsersUseCaseOptions): string {
        const datetime = moment().format("YYYY-MM-DD_HH-mm-ss");
        return `${name}-${datetime}.${format}`;
    }

    private buildBlobAndFilename(users: User[], options: ExportUsersUseCaseOptions) {
        return {
            blob: new Blob([this.buildExportDataString(users, options)], { type: "text/plain;charset=utf-8" }),
            filename: this.getFilename(options),
        };
    }

    private buildExportDataString(users: User[], { columns, format, orgUnitsField }: ExportUsersUseCaseOptions) {
        switch (format) {
            case "json": {
                const userRows = users.map(user => this.getPlainUser(user, columns, orgUnitsField, false));
                return JSON.stringify(userRows, null, 4);
            }
            case "csv": {
                // Convert object to array of values sorted by columns
                const userRows = users.map(user =>
                    _.at(this.getPlainUser(user, columns, orgUnitsField, true), columns)
                );
                const header = columns.map(this.getColumnNameFromProperty);
                const table = [header, ...userRows];
                return Papa.unparse(table);
            }
        }
    }

    private getColumnNameFromProperty(property: ColumnMappingKeys): string {
        return columnNameFromPropertyMapping[property] || property;
    }

    private formatDate(stringDate?: Date | null): string | undefined {
        return stringDate ? moment(stringDate).format("YYYY-MM-DD HH:mm:ss") : undefined;
    }

    private namesFromCollection(
        collection: User[
            | "userRoles"
            | "userGroups"
            | "organisationUnits"
            | "dataViewOrganisationUnits"
            | "searchOrganisationsUnits"],
        field: OrgUnitKey | typeof defaultNameField,
        toString: boolean
    ): string | string[] {
        // Check if field is in the collection, fallback on default name field
        const nameField = _.some(collection, field) ? field : defaultNameField;
        const namesArray = _(collection).map(nameField).value();

        return toString ? namesArray.join(fieldSplitChar) : namesArray;
    }

    private getPlainUser(
        user: User,
        columns: ColumnMappingKeys[],
        orgUnitsField: OrgUnitKey,
        toString: boolean
    ): Record<ColumnMappingKeys, typeof user[ColumnMappingKeys] | string[]> {
        return _.pick(
            {
                ...user,
                lastUpdated: this.formatDate(user.lastUpdated),
                lastLogin: this.formatDate(user.lastLogin),
                created: this.formatDate(user.created),
                userRoles: this.namesFromCollection(user.userRoles, defaultNameField, toString),
                userGroups: this.namesFromCollection(user.userGroups, defaultNameField, toString),
                organisationUnits: this.namesFromCollection(user.organisationUnits, orgUnitsField, toString),
                dataViewOrganisationUnits: this.namesFromCollection(
                    user.dataViewOrganisationUnits,
                    orgUnitsField,
                    toString
                ),
                searchOrganisationsUnits: this.namesFromCollection(
                    user.searchOrganisationsUnits,
                    orgUnitsField,
                    toString
                ),
                createdBy: user.createdBy?.username,
                lastModifiedBy: user.lastModifiedBy?.username,
            },
            columns
        );
    }
}

export type ColumnMappingKeys = keyof typeof columnNameFromPropertyMapping;

export type AllowedExportFormat = "json" | "csv";

export type ExportUsersUseCaseOptions = {
    name: string;
    columns: ColumnMappingKeys[];
    filterOptions?: ListOptions;
    format: AllowedExportFormat;
    orgUnitsField: OrgUnitKey;
    isEmptyTemplate?: boolean;
};
