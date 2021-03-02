import React from "react";
import PropTypes from "prop-types";
import BatchModelsMultiSelectModel from "./batch-models-multi-select/BatchModelsMultiSelect.model";
import BatchModelsMultiSelectComponent from "./batch-models-multi-select/BatchModelsMultiSelect.component";
import { getOwnedPropertyJSON } from "d2/lib/model/helpers/json";
import _m from "../utils/lodash-mixins";

function getPayload(allUserRoles, pairs) {
    const users = pairs.map(([user, newUserRolesForUser]) =>
        _m.imerge(getOwnedPropertyJSON(user), {
            userCredentials: _m.imerge(user.userCredentials, {
                userRoles: newUserRolesForUser.map(role => ({ id: role.id })),
            }),
        })
    );
    return { users };
}

function getTitle(getTranslation, users) {
    const usernames = users && users.map(user => user.userCredentials.username);
    const info = usernames ? _m.joinString(getTranslation, usernames, 3, ", ") : "...";
    return getTranslation("assignRoles") + ": " + info;
}

function UserRolesDialog(props, context) {
    const { d2 } = context;
    const getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);

    const modelOptions = {
        parentModel: d2.models.users,
        parentFields: ":owner,userCredentials[id,username,userRoles[id,name],lastLogin, disabled]",
        childrenModel: d2.models.userRoles,
        getChildren: user => user.userCredentials.userRoles,
        getPayload: getPayload,
    };

    return (
        <BatchModelsMultiSelectComponent
            model={new BatchModelsMultiSelectModel(context.d2, modelOptions)}
            parents={props.users}
            onRequestClose={props.onRequestClose}
            getTitle={users => getTitle(getTranslation, users)}
            onSuccess={getTranslation("user_roles_assigned")}
            onError={getTranslation("user_roles_assign_error")}
        />
    );
}

UserRolesDialog.contextTypes = {
    d2: PropTypes.object.isRequired,
};

export default UserRolesDialog;
