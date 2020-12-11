import React from "react";
import PropTypes from "prop-types";
import BatchModelsMultiSelectModel from "./batch-models-multi-select/BatchModelsMultiSelect.model";
import BatchModelsMultiSelectComponent from "./batch-models-multi-select/BatchModelsMultiSelect.component";
import _m from "../utils/lodash-mixins";

function getTitle(getTranslation, users) {
    const usernames = users && users.map(user => user.userCredentials.username);
    const info = usernames ? _m.joinString(getTranslation, usernames, 3, ", ") : "...";
    return getTranslation("copyInUser") + ": " + info;
}

function getPayload(pairs) {
    //I need to do this because when the pair maps, there might be more than 1 childUser but only 1 parentUser so
    //when it iterates the 2nd time for the other child, there is no 2nd parentUser
    const parent = pairs[0][0]
    const users = pairs.map(([user, childrenUsers]) => {
        let childrenUserRoles = childrenUsers.userCredentials.userRoles
        if(childrenUserRoles.length == 0)
        {
            return _m.imerge(childrenUsers, {
                userCredentials: _m.imerge(childrenUsers.userCredentials, { userRoles: parent.userCredentials.userRoles}),})
        }
        else
        {
            parent.userCredentials.userRoles.forEach(role => {
                if(childrenUserRoles.find(element => element.id == role.id) == undefined)
                {
                    childrenUserRoles.push(role)
                }
            })        
        }
        return childrenUsers
       
    })
    return {users};
 }

function CopyInUserDialog(props, context) {
    const { d2 } = context;
    const getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
    const modelOptions = {
        parentModel: d2.models.users,
        parentFields: ":owner,userCredentials[id,username,userRoles[id,name],lastLogin]",
        childrenModel: d2.models.users,
        getChildren: user => user.userCredentials.userRoles,
        getPayload: getPayload,
    };

    return (
        <BatchModelsMultiSelectComponent
            model={new BatchModelsMultiSelectModel(context.d2, modelOptions)}
            parents={props.users}
            onRequestClose={props.onRequestClose}
            getTitle={users => getTitle(getTranslation, users)}
            onSuccess={getTranslation("user_configuration_copied")}
            onError={getTranslation("user_configuration_copied_error")}
            copyInUser={true}
        />
    );
}

CopyInUserDialog.contextTypes = {
    d2: PropTypes.object.isRequired,
};

export default CopyInUserDialog;
