import React from "react";
import PropTypes from "prop-types";
import BatchModelsMultiSelectModel from "./batch-models-multi-select/BatchModelsMultiSelect.model";
import BatchModelsMultiSelectComponent from "./batch-models-multi-select/BatchModelsMultiSelect.component";
import { getOwnedPropertyJSON } from "d2/lib/model/helpers/json";
import _m from "../utils/lodash-mixins";

function getPayload(allUserGroups, pairs) {
    // Saving user groups is more complicated than saving userRoles. That's because we
    // cannot save users (the property userGroups is not owned by d2.models.User), instead we
    // have to save user groups, so we must invert the user/groups relationship.
    const allUserGroupsById = _.keyBy(allUserGroups, "id");
    const usersToSave = _(pairs)
        .map(([user, userGroupsForUser]) => user)
        .value();
    const groupIdsByUserId = _(pairs)
        .map(([user, userGroupsForUser]) => [
            user.id,
            new Set(userGroupsForUser.map(group => group.id)),
        ])
        .fromPairs()
        .value();
    const getUsersForGroup = group =>
        group.users
            .toArray()
            .concat(usersToSave)
            .filter(user => !groupIdsByUserId[user.id] || groupIdsByUserId[user.id].has(group.id))
            .map(user => ({ id: user.id }));
    const userGroups = _(pairs)
        .flatMap(([user, userGroupsForUser]) =>
            _.concat(user.userGroups.toArray(), userGroupsForUser)
        )
        .uniqBy(group => group.id)
        .map(userGroup => allUserGroupsById[userGroup.id])
        .compact()
        .map(group => _m.imerge(getOwnedPropertyJSON(group), { users: getUsersForGroup(group) }))
        .value();

    return { userGroups };
}

function getTitle(getTranslation, users) {
    const usernames = users && users.map(user => user.userCredentials.username);
    const info = usernames ? _m.joinString(getTranslation, usernames, 3, ", ") : "...";
    return getTranslation("assign_groups") + ": " + info;
}

function UserGroupsDialog(props, context) {
    const { d2 } = context;
    const getTranslation = d2.i18n.getTranslation.bind(d2.i18n);

    const modelOptions = {
        parentModel: d2.models.users,
        parentFields: "id,displayName,userCredentials[username],userGroups[id,name]",
        childrenModel: d2.models.userGroups,
        childrenFields: ":owner,id,name,users[id]",
        getChildren: user => user.userGroups,
        getPayload: getPayload,
    };

    return (
        <BatchModelsMultiSelectComponent
            model={new BatchModelsMultiSelectModel(d2, modelOptions)}
            parents={props.users}
            onRequestClose={props.onRequestClose}
            onSuccess={getTranslation("user_groups_assigned")}
            onError={getTranslation("user_groups_assign_error")}
            getTitle={users => getTitle(getTranslation, users)}
        />
    );
}

UserGroupsDialog.contextTypes = {
    d2: PropTypes.object.isRequired,
};

export default UserGroupsDialog;
