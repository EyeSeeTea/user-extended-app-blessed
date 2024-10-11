import { Maybe } from "../../types/utils";
import { Struct } from "./generic/Struct";
import { User } from "./User";

export class UserLogic extends Struct<User>() {
    static DEFAULT_PASSWORD = "District123$";

    static setDefaultLanguage(language: Maybe<string>): string {
        return language || "en";
    }

    static validateHasRequiredFields(users: User[]): boolean {
        return users.every(
            user => user.organisationUnits.length > 0 && user.userRoles.length > 0 && user.userGroups.length > 0
        );
    }
}
