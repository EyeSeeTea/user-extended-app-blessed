import { pick, merge, unzip, flatten, times, uniq } from 'lodash/fp';
import { generateUid } from 'd2/lib/uid';
import { getFromTemplate } from '../utils/template';

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

    _parseResponse(response, payload) {
        if (!response) {
            return { success: false };
        } else if (response.status !== 'OK') {
            const toArray = xs => (xs || []);
            const errors = toArray(response && response.typeReports)
                .map(typeReport => toArray(typeReport.objectReports)
                    .map(objectReport => objectReport.errorReports
                        .map(errorReport => [errorReport.mainKlass, errorReport.message].join(" - "))));
            const error = uniq(flatten(flatten(errors))).join("\n");
            return { success: false, response, error, payload };
        } else {
            return { success: true };
        }
    }

    replicateFromTemplate(count, usernameTemplate, passwordTemplate) {
        const userIds = times(() => generateUid(), count);
        const usernames = getFromTemplate(usernameTemplate, count);
        const passwords = getFromTemplate(passwordTemplate, count);
        const values = [userIds, usernames, passwords];
        const newUserFields = unzip(values).map(([id, username, password]) =>
            ({ id, username, password }));

        return this.replicateFromPlainFields(newUserFields);
    }

    // newUserFields: [{id, username, password, name, email}]
    replicateFromPlainFields(newUserFields) {
        const optional = (value) => value || undefined;
        const nullable = (value) => value || null;

        const newUsersAttributes = newUserFields.map(userFields => ({
            id: userFields.id,
            email: optional(userFields.email),
            firstName: optional(userFields.firstName),
            surname: optional(userFields.surname),
            userCredentials: {
              id: generateUid(),
              openId: nullable(userFields.openId),
              ldapId: nullable(userFields.ldapId),
              userInfo: { id: userFields.id },
              code: userFields.username,
              username: userFields.username,
              password: userFields.password,
            },
        }));

        return this.replicate(newUsersAttributes);
    }

    async replicate(newUsersAttributes) {
        const ownedProperties = this.d2.models.user.getOwnedPropertyNames();
        const userJson = pick(ownedProperties, this.attributes);
        const newUsers = newUsersAttributes.map(newUserAttributes => merge(userJson, newUserAttributes));

        /*
        NOTE: `userGroups` is not owned property by the model User. That means that values
        users[].userGroup of the metadata request are simply ignored. Therefore, we must
        send the related userGroups -with the updated users- in the same request to the metadata.

        Pros: Performs the whole operation in a single request, within a transaction.
        Cons: Requires the current user to be able to edit those user groups.
        Alternatives: We could us `/api/users/ID` or `users/ID/replica` (this copies user settings),
        but that would require one request by each new user.
        */

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
            .post("metadata?importStrategy=CREATE_AND_UPDATE&mergeMode=MERGE", payload)
            .then(res => this._parseResponse(res, payload))
            .catch(error => ({ success: false, error }));
    }

    static async getById(d2, userId) {
        const api = d2.Api.getApi();
        const userAttributes = await api.get(`/users/${userId}`, { fields: ":all" });
        return new User(d2, userAttributes);
    }

    static async getExistingUsernames(d2) {
        const api = d2.Api.getApi();
        const { users } = await api.get('/users', {
            fields: "id, userCredentials[username]",
            paging: false,
        });
        const usernames = users.map(user => user.userCredentials.username);
        return new Set(usernames);
    }
}

export default User;
