import React from "react";
import PropTypes from "prop-types";
import _ from "lodash";
import Dialog from "material-ui/Dialog/Dialog";
import FlatButton from "material-ui/FlatButton/FlatButton";
import TextField from "material-ui/TextField/TextField";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import FormBuilder from "d2-ui/lib/forms/FormBuilder.component";
import Validators from "d2-ui/lib/forms/Validators";
import camelCaseToUnderscores from "d2-utilizr/lib/camelCaseToUnderscores";

import {
    toBuilderValidator,
    validateValues,
    validateUsername,
    validatePassword,
} from "../utils/validators";
import User from "../models/user";
import { getExistingUsers } from "../models/userHelpers";
import { getFromTemplate } from "../utils/template";
import snackActions from "../Snackbar/snack.actions";
import InfoDialog from "./InfoDialog";
import LoadingMask from "../loading-mask/LoadingMask.component";

const styles = {
    dialog: {
        minWidth: 600,
        maxWidth: 800,
    },
    cancelButton: {
        marginRight: 16,
    },
};

class ReplicateUserFromTemplate extends React.Component {
    maxUsers = 100;
    defaultPassword = "District123_$index";

    constructor(props, context) {
        super(props);
        const { d2 } = context;
        this.getTranslation = d2.i18n.getTranslation.bind(d2.i18n);
        this.validators = this.getValidators();

        this.state = {
            isValid: false,
            usersToCreate: 1,
            username: "",
            password: "",
            existingUsernames: null,
            validate: false,
            infoDialog: null,
        };
    }

    async componentDidMount() {
        const { userToReplicateId } = this.props;
        const existingUsers = await getExistingUsers(d2);
        const existingUsernames = new Set(existingUsers.map(user => user.userCredentials.username));
        const userToReplicate = await User.getById(d2, userToReplicateId);
        const username = `${userToReplicate.username}_$index`;
        this.setState({
            existingUsernames,
            userToReplicate,
            username,
            password: this.defaultPassword,
            validate: true,
        });
    }

    onUpdateField = (field, value) => {
        this.setState({ [field]: value, validate: true });
    };

    onUpdateFormStatus = formStatus => {
        const isValid = !formStatus.asyncValidating && formStatus.valid;
        this.setState({ isValid, validate: false });
    };

    closeInfoDialog = () => {
        this.setState({ infoDialog: null });
    };

    getValuesFromTemplate(template) {
        const { usersToCreate } = this.state;
        const n = Math.min(parseInt(usersToCreate) || 1, this.maxUsers);
        return getFromTemplate(template, n);
    }

    getValidators() {
        return {
            isRequired: {
                validator: Validators.isRequired,
                message: this.getTranslation(Validators.isRequired.message),
            },
            withinInterval: (min, max) => ({
                validator: value => value && value >= min && value <= max,
                message: this.getTranslation("validate_interval_error_message", { min, max }),
            }),
            isValidUsername: toBuilderValidator(
                usernameTemplate => {
                    const { existingUsernames, usersToCreate } = this.state;
                    const usernamesFromTemplate = this.getValuesFromTemplate(usernameTemplate);
                    const getOthersInTemplate = username => {
                        const index = _(usernamesFromTemplate).indexOf(username);
                        return new Set([
                            ...usernamesFromTemplate.slice(0, index),
                            ...usernamesFromTemplate.slice(index + 1),
                        ]);
                    };

                    return validateValues(usernamesFromTemplate, username =>
                        validateUsername(existingUsernames, getOthersInTemplate(username), username)
                    );
                },
                (username, error) => this.getTranslation(`username_${error}`, { username })
            ),
            isValidPassword: toBuilderValidator(
                passwordTemplate =>
                    validateValues(this.getValuesFromTemplate(passwordTemplate), password =>
                        validatePassword(password)
                    ),
                (password, error) => this.getTranslation(`password_${error}`)
            ),
        };
    }

    getTextField(name, type, value, { label, validators }) {
        return {
            component: TextField,
            name,
            value,
            props: {
                type,
                style: { width: "100%" },
                floatingLabelText: label || this.getTranslation(camelCaseToUnderscores(name)),
            },
            validators,
        };
    }

    onSave = async () => {
        const { onRequestClose } = this.props;
        const { userToReplicate, usersToCreate, username, password } = this.state;
        const response = await userToReplicate.replicateFromTemplate(
            usersToCreate,
            username,
            password
        );

        if (response.success) {
            const message = this.getTranslation("replicate_successful", {
                user: userToReplicate.displayName,
                n: usersToCreate,
            });
            snackActions.show({ message });
            onRequestClose();
        } else {
            this.setState({ infoDialog: { response } });
        }
    };

    render() {
        const { onRequestClose } = this.props;
        const {
            infoDialog,
            userToReplicate,
            invalidUsernames,
            usersToCreate,
            username,
            password,
            isValid,
            validate,
        } = this.state;
        const title = this.getTranslation("replicate_user", {
            user: userToReplicate
                ? `${userToReplicate.displayName} (${userToReplicate.username})`
                : "",
        });
        const t = this.getTranslation;

        const actions = [
            <FlatButton
                label={this.getTranslation("close")}
                onClick={onRequestClose}
                style={styles.cancelButton}
            />,
            <RaisedButton
                primary={true}
                label={t("replicate")}
                disabled={!isValid}
                onClick={this.onSave}
            />,
        ];

        const fields = [
            this.getTextField("usersToCreate", "number", usersToCreate, {
                validators: [
                    this.validators.isRequired,
                    this.validators.withinInterval(1, this.maxUsers),
                ],
            }),
            this.getTextField("username", "string", username, {
                validators: [this.validators.isValidUsername],
                label: this.getTranslation("username_replicate_field"),
            }),
            this.getTextField("password", "string", password, {
                validators: [this.validators.isValidPassword],
            }),
        ];

        return (
            <Dialog
                open={true}
                title={title}
                actions={actions}
                autoScrollBodyContent={true}
                autoDetectWindowHeight={true}
                contentStyle={styles.dialog}
                onRequestClose={onRequestClose}
            >
                {!userToReplicate ? <LoadingMask /> : null}

                {infoDialog ? (
                    <InfoDialog
                        t={this.getTranslation}
                        title={this.getTranslation("replicate_error")}
                        onClose={this.closeInfoDialog}
                        response={infoDialog.response}
                    />
                ) : null}

                <FormBuilder
                    fields={fields}
                    onUpdateField={this.onUpdateField}
                    onUpdateFormStatus={this.onUpdateFormStatus}
                    validateOnRender={validate}
                    validateFullFormOnChanges={true}
                />
            </Dialog>
        );
    }
}

ReplicateUserFromTemplate.contextTypes = {
    d2: PropTypes.object.isRequired,
};

ReplicateUserFromTemplate.propTypes = {
    userToReplicateId: PropTypes.string.isRequired,
    onRequestClose: PropTypes.func.isRequired,
    settings: PropTypes.object,
};

export default ReplicateUserFromTemplate;
