import _ from "lodash";
import { Future, FutureData } from "../entities/Future";
import { User, defaultUser } from "../entities/User";
import { UserRepository } from "../repositories/UserRepository";
import { UseCase } from "../../CompositionRoot";
import { generateUid } from "../../utils/uid";
import { UserLogic } from "../entities/UserLogic";

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

    public execute({ users }: ImportUsersUseCaseOptions): FutureData<void> {
        const usernameList = users.map(user => user.username);
        return Future.join2(
            this.userRepository.listAll({ filters: { "userCredentials.username": ["in", usernameList] } }),
            this.userRepository.getCurrent()
        ).flatMap(([usersFromDB, currentUser]: [User[], User]) => {
            const hasRequiredFields = UserLogic.validateHasRequiredFields(users);
            if (!hasRequiredFields)
                return Future.error("All users must have at least one Organisation Unit, Role and Group");

            const hasDuplicatedUsernames = _.uniq(usernameList).length !== usernameList.length;
            if (hasDuplicatedUsernames) return Future.error("Usernames must be unique");

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
                    dbLocale: UserLogic.setDefaultLanguage(dbUser.dbLocale),
                    uiLocale: UserLogic.setDefaultLanguage(dbUser.uiLocale),
                };
            }
            return {
                ...defaultUser,
                ...user,
                id: generateUid(),
                name: `${user.firstName} ${user.surname}`,
                createdBy: { id, username },
                lastModifiedBy: { id, username },
                dbLocale: UserLogic.setDefaultLanguage(user.dbLocale),
                uiLocale: UserLogic.setDefaultLanguage(user.uiLocale),
            };
        });
    }

    private saveUsers(users: User[]): FutureData<void> {
        return this.userRepository.save(users).toVoid();
    }
}

export type ImportUsersUseCaseOptions = { users: User[] };
