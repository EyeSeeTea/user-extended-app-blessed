import React from "react";
import PropTypes from "prop-types";
import _ from "lodash";
import TextField from "material-ui/TextField/TextField";
import FormBuilder from "d2-ui/lib/forms/FormBuilder.component";
import Validators from "d2-ui/lib/forms/Validators";
import camelCaseToUnderscores from "d2-utilizr/lib/camelCaseToUnderscores";

import { toBuilderValidator, validateValues, validateUsername, validatePassword } from "../utils/validators";
import User from "../models/user";
import { getExistingUsers } from "../models/userHelpers";
import { getFromTemplate } from "../utils/template";
import snackActions from "../Snackbar/snack.actions";
import InfoDialog from "./InfoDialog";
import LoadingMask from "../loading-mask/LoadingMask.component";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import i18n from "../../locales";

class ReplicateUserFromTemplate extends React.Component {
    maxUsers = 100;
    defaultPassword = "District123_$index";

    constructor(props, context) {
        super(props);
        const { d2 } = context;
        this.getTranslation = d2.i18n.getTranslation.bind(d2.i18n);
        this.validators = this.getValidators();

        this.state = {
            isValid: true,
            usersToCreate: 1,
            username: "",
            password: "",
            existingUsernames: null,
            validate: true,
            infoDialog: null,
        };
    }

    componentDidMount = async () => {
        const { userToReplicateId } = this.props;
        const existingUsers = await getExistingUsers(this.context.d2);
        const existingUsernames = new Set(existingUsers.map(user => user.userCredentials.username));
        const userToReplicate = await User.getById(this.context.d2, userToReplicateId);
        const username = `${userToReplicate.username}_$index`;
        this.setState({
            existingUsernames,
            userToReplicate,
            username,
            password: this.defaultPassword,
            validate: true,
        });
    };

    onUpdateField = (field, value) => {
        this.setState({ [field]: value, validate: true });
    };

    onUpdateFormStatus = ({ asyncValidating = false, valid }) =>
        this.setState({ isValid: !asyncValidating && valid, validate: false });

    closeInfoDialog = () => {
        this.setState({ infoDialog: null });
    };

    getValuesFromTemplate(template) {
        const { usersToCreate } = this.state;
        const n = Math.min(parseInt(usersToCreate) || 1, this.maxUsers);
        return getFromTemplate(template, n);
    }

    getValidators = () => {
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
                    const { existingUsernames } = this.state;
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
    };

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
        const response = await userToReplicate.replicateFromTemplate(usersToCreate, username, password);

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

    render = () => {
        const { onRequestClose } = this.props;
        const { infoDialog, userToReplicate, usersToCreate, username, password, isValid, validate } = this.state;
        const title = this.getTranslation("replicate_user_title", {
            user: userToReplicate ? `${userToReplicate.displayName} (${userToReplicate.username})` : "",
        });
        const t = this.getTranslation;

        const fields = [
            this.getTextField("usersToCreate", "number", usersToCreate, {
                validators: [this.validators.isRequired, this.validators.withinInterval(1, this.maxUsers)],
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
            <ConfirmationDialog
                isOpen={true}
                title={title}
                maxWidth={"md"}
                fullWidth={true}
                onSave={this.onSave}
                saveText={t("replicate")}
                onCancel={onRequestClose}
                disableSave={!isValid}
            >
                {!userToReplicate ? <LoadingMask /> : null}

                {infoDialog ? (
                    <InfoDialog
                        t={this.getTranslation}
                        title={i18n.t("Replicate error")}
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
            </ConfirmationDialog>
        );
    };
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
