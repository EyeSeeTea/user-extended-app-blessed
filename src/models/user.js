import { pick, merge, unzip, flatten, times, uniq } from "lodash/fp";
import { generateUid } from "d2/lib/uid";
import { getFromTemplate } from "../utils/template";
import { parseResponse } from "./userHelpers";

class User {
    constructor(d2, attributes) {
        this.d2 = d2;
        this.attributes = attributes;
        this.api = d2.Api.getApi();
    }

    get displayName() {
        return this.attributes.displayName;
    }

    get username() {
        const { userCredentials } = this.attributes;
        return userCredentials ? userCredentials.username : null;
    }

    replicateFromTemplate(count, usernameTemplate, passwordTemplate) {
        const userIds = times(() => generateUid(), count);
        const usernames = getFromTemplate(usernameTemplate, count);
        const passwords = getFromTemplate(passwordTemplate, count);
        const values = [userIds, usernames, passwords];
        const newUserFields = unzip(values).map(([id, username, password]) => ({
            id,
            username,
            password,
        }));

        return this.replicateFromPlainFields(newUserFields);
    }

    // newUserFields: [{id, username, password, name, email}]
    replicateFromPlainFields(newUserFields) {
        const optional = value => value || undefined;
        const nullable = value => value || null;

        const newUsersAttributes = newUserFields.map(userFields => ({
            id: userFields.id,
            email: optional(userFields.email),
            firstName: optional(userFields.firstName),
            surname: optional(userFields.surname),
            userCredentials: {
                id: generateUid(),
                openId: nullable(userFields.openId),
                ldapId: nullable(userFields.ldapId),
                code: nullable(userFields.code),
                userInfo: { id: userFields.id },
                username: userFields.username,
                password: userFields.password,
            },
            organisationUnits: optional(userFields.organisationUnits),
            dataViewOrganisationUnits: optional(userFields.dataViewOrganisationUnits),
        }));

        return this.replicate(newUsersAttributes);
    }

    async replicate(newUsersAttributes) {
        const ownedProperties = this.d2.models.user.getOwnedPropertyNames();
        const userJson = pick(ownedProperties, this.attributes);
        const newUsers = newUsersAttributes.map(newUserAttributes =>
            merge(userJson, newUserAttributes)
        );
        const userGroupIds = this.attributes.userGroups.map(userGroup => userGroup.id);
        const { userGroups } = await this.api.get("/userGroups", {
            filter: "id:in:[" + userGroupIds.join(",") + "]",
            fields: ":owner",
            paging: false,
        });
        const userGroupsWithNewUsers = userGroups.map(userGroup => ({
            ...userGroup,
            users: userGroup.users.concat(newUsers.map(newUser => ({ id: newUser.id }))),
        }));
        const payload = { users: newUsers, userGroups: userGroupsWithNewUsers };

        return this.api
            .post("metadata?importStrategy=CREATE_AND_UPDATE&mergeMode=REPLACE", payload)
            .then(res => parseResponse(res, payload))
            .catch(error => ({ success: false, error }));
    }

    static async getById(d2, userId) {
        const api = d2.Api.getApi();
        const userAttributes = await api.get(`/users/${userId}`, {
            fields:
                ":all," +
                "organisationUnits[id,code,shortName,displayName,path]," +
                "dataViewOrganisationUnits[id,code,shortName,displayName,path]",
        });
        return new User(d2, userAttributes);
    }
}

export default User;
