import _ from "lodash";
import moment from "moment";
import Papa from "papaparse";
import i18n from "../../locales";

import { Future, FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { ListOptions, UserRepository } from "../repositories/UserRepository";
import { UseCase } from "../../CompositionRoot";

const fieldSplitChar = "||";
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
    createdBy: i18n.t("Created by"),
    lastModifiedBy: i18n.t("Last modified by"),
};

export class ExportUsersUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute({
        filterOptions = {},
        isEmptyTemplate,
        ...options
    }: ExportUsersUseCaseOptions): FutureData<{ blob: Blob; filename: string }> {
        const filename = this.getFilename(options);

        if (isEmptyTemplate) {
            return Future.success({
                blob: new Blob([this.buildExportDataString([], options)], { type: "text/plain;charset=utf-8" }),
                filename,
            });
        }
        return this.userRepository.listAll(filterOptions).map(users => {
            return {
                blob: new Blob([this.buildExportDataString(users, options)], { type: "text/plain;charset=utf-8" }),
                filename,
            };
        });
    }

    private getFilename({ name, format }: ExportUsersUseCaseOptions): string {
        const datetime = moment().format("YYYY-MM-DD_HH-mm-ss");
        return `${name}-${datetime}.${format}`;
    }

    private buildExportDataString(
        users: User[],
        { columns, format }: Pick<ExportUsersUseCaseOptions, "columns" | "format">
    ) {
        switch (format) {
            case "json": {
                const userRows = users.map(user => this.getPlainUser(user, columns, false));
                return JSON.stringify(userRows, null, 4);
            }
            case "csv": {
                const userRows = users.map(user => this.getPlainUser(user, columns, true));
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
        toString: boolean
    ): string | string[] {
        const nameField = "name";
        const namesArray = _(collection).map(nameField).value();

        return toString ? namesArray.join(fieldSplitChar) : namesArray;
    }

    private getPlainUser(
        user: User,
        columns: ColumnMappingKeys[],
        toString: boolean
    ): Record<ColumnMappingKeys, typeof user[ColumnMappingKeys] | string[]> {
        return _.pick(
            {
                ...user,
                lastUpdated: this.formatDate(user.lastUpdated),
                lastLogin: this.formatDate(user.lastLogin),
                created: this.formatDate(user.created),
                userRoles: this.namesFromCollection(user.userRoles, toString),
                userGroups: this.namesFromCollection(user.userGroups, toString),
                organisationUnits: this.namesFromCollection(user.organisationUnits, toString),
                dataViewOrganisationUnits: this.namesFromCollection(user.dataViewOrganisationUnits, toString),
                searchOrganisationsUnits: this.namesFromCollection(user.searchOrganisationsUnits, toString),
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
    isEmptyTemplate?: boolean;
};
