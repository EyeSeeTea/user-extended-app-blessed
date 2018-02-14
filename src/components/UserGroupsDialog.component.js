import React from 'react';
import PropTypes from 'prop-types';
import BatchModelsMultiSelectModel from './batch-models-multi-select/BatchModelsMultiSelect.model';
import BatchModelsMultiSelectComponent from './batch-models-multi-select/BatchModelsMultiSelect.component';
import { getOwnedPropertyJSON } from 'd2/lib/model/helpers/json';
import _m from '../utils/lodash-mixins';

function getPayload(allUserGroups, pairs) {
    // The saving of user groups is more convoluted than the saving of userRoles. That's because we
    // cannot just save users (as the property useruserGroups is not owned by the User model), we
    // must save userGroups, so we must invert the relationships.
    const allUserGroupsById = _.keyBy(allUserGroups, "id");
    const users = _(pairs).map(([user, userGroupsForUser]) => user).value();
    const relations = _(pairs)
        .map(([user, userGroupsForUser]) =>
            [user.id, new Set(userGroupsForUser.map(group => group.id))])
        .fromPairs()
        .value();
    const updateUsersInGroup = (group) => {
        // A user is kept in a group if it has no relations (it's not a user we are editing)
        // or if it's being edited and is included amongst the groups to keep for the edited user.
        const newUsers = _(group.users.toArray())
            .concat(users)
            .filter(user => !relations[user.id] || relations[user.id].has(group.id))
            .value();
        return _m.imerge(getOwnedPropertyJSON(group), {users: newUsers.map(u => ({id: u.id}))});
    };
    const userGroups = _(pairs)
        .flatMap(([user, userGroupsForUser]) =>_.concat(user.userGroups.toArray(), userGroupsForUser))
        .uniqBy(userGroup => userGroup.id)
        .map(userGroup => allUserGroupsById[userGroup.id])
        .map(group => updateUsersInGroup(group))
        .value();

    return {userGroups};
}

function getTitle(getTranslation, users) {
    const usernames = users && users.map(user => user.userCredentials.username);
    const info = usernames ? _m.joinString(getTranslation, usernames, 3, ", ") : "...";
    return getTranslation('assignGroups') + ": " + info;
}

function UserGroupsDialog(props, context) {
    const {d2} = context;
    const getTranslation = d2.i18n.getTranslation.bind(d2.i18n);

    const modelOptions = {
        parentModel: d2.models.users,
        parentFields: ':owner,userGroups[id,name]',
        childrenModel: d2.models.userGroups,
        childrenFields: 'id,name,users[id]',
        getChildren: user => user.userGroups,
        getPayload: getPayload,
    };

    return (
        <BatchModelsMultiSelectComponent
            model={new BatchModelsMultiSelectModel(d2, modelOptions)}
            parents={props.users}
            onRequestClose={props.onRequestClose}
            onSuccess={getTranslation('user_groups_assigned')}
            onError={getTranslation('user_groups_assign_error')}
            getTitle={users => getTitle(getTranslation, users)}
        />
    );
}

UserGroupsDialog.contextTypes = {
    d2: PropTypes.object.isRequired,
};

export default UserGroupsDialog;