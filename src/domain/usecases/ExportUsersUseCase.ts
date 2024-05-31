import _ from "lodash";
import moment from "moment";
import Papa from "papaparse";
import i18n from "../../locales";

import { FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { ListOptions, UserRepository } from "../repositories/UserRepository";

import { UseCase } from "../../CompositionRoot";

// Constants
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
    createdBy: i18n.t("created by"),
    lastModifiedBy: i18n.t("Last modified by"),
};

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
        { columns, format }: Pick<ExportUsersUseCaseOptions, "columns" | "format">
    ) {
        switch (format) {
            case "json": {
                const userRows = users.map(user => _.pick(this.getPlainUser(user, true), columns));
                return JSON.stringify(userRows, null, 4);
            }
            case "csv": {
                const userRows = users.map(user => _.at(this.getPlainUser(user, false), columns));
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

    private namesFromCollection(
        collection: Array<
            User[
                | "userRoles"
                | "userGroups"
                | "organisationUnits"
                | "dataViewOrganisationUnits"
                | "searchOrganisationsUnits"]
        >,
        toArray: boolean
    ): any {
        const nameField = "name";
        const namesArray = _(collection).map(nameField);

        return toArray ? namesArray : namesArray.join(fieldSplitChar);
    }

    private getPlainUser(user: any, toArray: boolean): Record<ColumnMappingKeys, string | string[]> {
        return {
            ...user,
            lastUpdated: this.formatDate(user.lastUpdated),
            lastLogin: this.formatDate(user.lastLogin),
            created: this.formatDate(user.created),
            userRoles: this.namesFromCollection(user.userRoles, toArray),
            userGroups: this.namesFromCollection(user.userGroups, toArray),
            organisationUnits: this.namesFromCollection(user.organisationUnits, toArray),
            dataViewOrganisationUnits: this.namesFromCollection(user.dataViewOrganisationUnits, toArray),
            searchOrganisationsUnits: this.namesFromCollection(user.searchOrganisationsUnits, toArray),
            createdBy: user.createdBy?.username,
            lastModifiedBy: user.lastModifiedBy?.username,
        };
    }
}

export type ColumnMappingKeys = keyof typeof columnNameFromPropertyMapping;

export type ExportUsersUseCaseOptions = {
    columns: ColumnMappingKeys[];
    filterOptions: ListOptions;
    orgUnitsField: any; // TODO type
    format: "json" | "csv";
};
