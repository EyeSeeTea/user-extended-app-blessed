import _ from "lodash";
import moment from "moment";
import Papa from "papaparse";

import { FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { ListFilters, UserRepository } from "../repositories/UserRepository";

import { UseCase } from "../../CompositionRoot";

// Constants
const fieldSplitChar = "||";
const columnNameFromPropertyMapping: Record<string, string> = {
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


export class ExportUsersUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute(options: ExportUsersUseCaseOptions): FutureData<Promise<string>> {
        const { search, sorting } = options.filterOptions;
        const filters: ListFilters = {
            search,
            sorting,
        };

        return this.userRepository.listAll(filters).map(users => {
            return this.exportUsers(users, options);
        });
    }

    private async exportUsers(users: User[], { columns, orgUnitsField, format }: ExportUsersUseCaseOptions) {
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

    private getColumnNameFromProperty(property: string): string {
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
}

export type ExportUsersUseCaseOptions = {
    columns: string[];
    filterOptions: Record<string, any>;
    orgUnitsField: any; // TODO type
    format: "json" | "csv";
};
