import React from "react";
import PropTypes from "prop-types";
import snackActions from "../Snackbar/snack.actions";

import User from "../models/user";
import ImportTable from "./ImportTable.component";
import LoadingMask from "../loading-mask/LoadingMask.component";

class ReplicateUserFromTable extends React.Component {
    columns = [
        "username",
        "password",
        "firstName",
        "surname",
        "email",
        "organisationUnitsCapture",
        "dataViewOrganisationUnits",
    ];

    constructor(props, context) {
        super(props);
        const { d2 } = context;
        this.t = d2.i18n.getTranslation.bind(d2.i18n);

        this.state = {
            userToReplicate: null,
        };
    }

    async componentDidMount() {
        const { userToReplicateId } = this.props;
        const userToReplicate = await User.getById(d2, userToReplicateId);
        this.setState({ userToReplicate });
    }

    replicateUsers = async users => {
        const { userToReplicate } = this.state;
        const response = await userToReplicate.replicateFromPlainFields(users);

        if (response.success) {
            const message = this.t("replicate_successful", {
                user: userToReplicate.displayName,
                n: users.length,
            });
            snackActions.show({ message });
            return null;
        } else {
            return response;
        }
    };

    render() {
        const { onRequestClose } = this.props;
        const { userToReplicate } = this.state;
        const title = this.t("replicate_user", {
            user: userToReplicate
                ? `${userToReplicate.displayName} (${userToReplicate.username})`
                : "",
        });

        return !userToReplicate ? (
            <LoadingMask />
        ) : (
            <ImportTable
                title={title}
                onSave={this.replicateUsers}
                maxUsers={100}
                templateUser={userToReplicate}
                actionText={this.t("replicate")}
                onRequestClose={onRequestClose}
                columns={this.columns}
                settings={this.props.settings}
            />
        );
    }
}

ReplicateUserFromTable.contextTypes = {
    d2: PropTypes.object.isRequired,
};

ReplicateUserFromTable.propTypes = {
    userToReplicateId: PropTypes.string.isRequired,
    onRequestClose: PropTypes.func.isRequired,
    settings: PropTypes.object.isRequired,
};

export default ReplicateUserFromTable;
