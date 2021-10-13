import React from "react";
import PropTypes from "prop-types";
import CopyInUserBatchModelsMultiSelectComponent from "./batch-models-multi-select/CopyInUserBatchModelsMultiSelect.component";
import CopyInUserBatchModelsMultiSelectModel from "./batch-models-multi-select/CopyInUserBatchModelsMultiSelect.model";
import _m from "../utils/lodash-mixins";
import { getPayload } from "../models/userHelpers";

function getTitle(getTranslation, users) {
    const usernames = users && users.map(user => user.userCredentials.username);
    const info = usernames ? _m.joinString(getTranslation, usernames, 3, ", ") : "...";
    return getTranslation("copy_in_user") + ": " + info;
}

function CopyInUserDialog(props, context) {
    const { d2 } = context;
    const getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
    const modelOptions = {
        parentModel: d2.models.users,
        parentFields: ":owner,userCredentials[id,username,userRoles[id,name],lastLogin]",
        childrenModel: d2.models.users,
        getChildren: user => user.userCredentials.userRoles,
        getPayload,
    };

    return (
        <CopyInUserBatchModelsMultiSelectComponent
            model={new CopyInUserBatchModelsMultiSelectModel(context.d2, modelOptions)}
            parents={props.user}
            onCancel={props.onCancel}
            getTitle={users => getTitle(getTranslation, users)}
            onSuccess={getTranslation("user_configuration_copied")}
            onError={getTranslation("user_configuration_copied_error")}
        />
    );
}

CopyInUserDialog.contextTypes = {
    d2: PropTypes.object.isRequired,
};

CopyInUserDialog.propTypes = {
    user: PropTypes.array.isRequired,
    onRequestClose: PropTypes.func.isRequired,
};

export default CopyInUserDialog;
