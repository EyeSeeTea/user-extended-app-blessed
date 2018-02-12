import _ from 'lodash';
import { getOwnedPropertyJSON } from 'd2/lib/model/helpers/json';

export default class UserRolesDialogModel {
    constructor(d2) {
        this.d2 = d2;
    }

    getAllUserRoles() {
        return this.d2.models.userRoles
            .list({
                fields: ['id', 'displayName'].join(","),
                paging: false,
            })
            .then(collection => _(collection.toArray()).sortBy("displayName").value());
    }

    getUsers(users) {
        const userIds = _(users).map(user => user.id).compact().value();
        return this.d2.models.users.get(userIds, {fields: ':owner'})
            .then(collection => collection.toArray());
    }

    save(users, selectedUserRoleIds, updateStrategy) {
        const api = this.d2.Api.getApi();
        const userRoles = selectedUserRoleIds.map(roleId => ({id: roleId}));
        const merge = (...objs) => _.extend({}, ...objs);
        const newUserRoles = this.getUserRoles(users, userRoles, updateStrategy);
        const usersPayload = _.zip(users, newUserRoles).map(([user, newUserRoles]) =>
            merge(getOwnedPropertyJSON(user), {
                userCredentials: merge(user.userCredentials, {userRoles: newUserRoles})
            }));
        const metadataUrl = "metadata?importStrategy=UPDATE&mergeMode=MERGE";
        const payload = {users: usersPayload};

        return api.post(metadataUrl, payload).then(response => {
            if (response.status !== 'OK') {
                throw new Error(response.toString());
            } else {
                return response;
            }
        });
    }

    getSelectedRoles(users) {
        const commonUserRoles = _.intersectionBy(...users.map(user => user.userCredentials.userRoles), "id");
        return _(commonUserRoles).sortBy(role => role.displayName).value();
    }

    getUserRoles(users, newUserRoles, updateStrategy) {
        const userRolesAssignedToAllUsers = this.getSelectedRoles(users);
        const getUserRolesForUser = (user) => {
            switch(updateStrategy) {
                case "merge":
                    const userRolesToRemove = _.differenceBy(userRolesAssignedToAllUsers, newUserRoles, "id");
                    const userRolesToAdd = _.differenceBy(newUserRoles, userRolesAssignedToAllUsers, "id");
                    return _(user.userCredentials.userRoles)
                        .differenceBy(userRolesToRemove, "id")
                        .concat(userRolesToAdd)
                        .value();
                case "replace":
                    return newUserRoles;
                default:
                    throw new Error("Unknown strategy: " + strategy);
            }
        };
        return users.map(getUserRolesForUser);
    }
}
