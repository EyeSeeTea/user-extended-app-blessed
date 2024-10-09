import _ from "lodash";
import { Future, FutureData } from "../entities/Future";
import { User, defaultUser } from "../entities/User";
import { UserRepository } from "../repositories/UserRepository";
import { UseCase } from "../../CompositionRoot";
import { generateUid } from "../../utils/uid";
import { Maybe } from "../../types/utils";
import { MetadataResponse } from "@eyeseetea/d2-api/api";
import { OrgUnit } from "../entities/OrgUnit";

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

export class ImportUsersUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute({ users }: ImportUsersUseCaseOptions): FutureData<MetadataResponse> {
        const usernameList = users.map(user => user.username);
        return Future.join2(
            this.userRepository.listAll({ filters: { "userCredentials.username": ["in", usernameList] } }),
            this.userRepository.getCurrent()
        ).flatMap(([usersFromDB, currentUser]: [User[], User]) => {
            const mergedUsers = this.mergeUsers(users, usersFromDB, currentUser);
            return this.saveUsers(mergedUsers);
        });
    }

    private mergeUsers(users: User[], usersFromDB: User[], { id, username }: User = defaultUser): User[] {
        const usersFromDBMap = _.keyBy(usersFromDB, key => key.username);
        // Merge properties from usersFromDB into users
        return users.map((userFromImport): User => {
            const user = _.pick(userFromImport, Object.keys(columnNameFromPropertyMapping));
            const dbUser = _.find(usersFromDBMap, userFromDB => userFromDB.username === user.username);
            if (dbUser) {
                // Merge user with dbUser, but do not overwrite existing properties in user
                return {
                    ...dbUser,
                    ...user,
                    name: `${user.firstName} ${user.surname}`,
                    lastModifiedBy: { id, username },
                    dbLocale: this.setDefaultLanguage(dbUser.dbLocale),
                    uiLocale: this.setDefaultLanguage(dbUser.uiLocale),
                    dataViewOrganisationUnits: this.getOrgUnitRef(dbUser, user, "dataViewOrganisationUnits"),
                    searchOrganisationsUnits: this.getOrgUnitRef(dbUser, user, "searchOrganisationsUnits"),
                };
            }
            return {
                ...defaultUser,
                ...user,
                id: generateUid(),
                name: `${user.firstName} ${user.surname}`,
                createdBy: { id, username },
                lastModifiedBy: { id, username },
                dbLocale: this.setDefaultLanguage(user.dbLocale),
                uiLocale: this.setDefaultLanguage(user.uiLocale),
            };
        });
    }

    private getOrgUnitRef(
        dbUser: User,
        user: Partial<User>,
        orgUnitFieldName: "dataViewOrganisationUnits" | "organisationUnits" | "searchOrganisationsUnits"
    ): OrgUnit[] {
        const orgUnits = user[orgUnitFieldName] || [];
        return _(dbUser[orgUnitFieldName]).concat(orgUnits).value();
    }

    private setDefaultLanguage(language: Maybe<string>): string {
        return language || "en";
    }

    private saveUsers(users: User[]): FutureData<MetadataResponse> {
        return this.userRepository.save(users);
    }
}

export type ImportUsersUseCaseOptions = { users: User[] };
