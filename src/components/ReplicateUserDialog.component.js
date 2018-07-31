import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Dialog from 'material-ui/Dialog/Dialog';
import FlatButton from 'material-ui/FlatButton/FlatButton';
import TextField from 'material-ui/TextField/TextField';
import RaisedButton from 'material-ui/RaisedButton/RaisedButton';
import FormBuilder from 'd2-ui/lib/forms/FormBuilder.component';
import LoadingMask from '../loading-mask/LoadingMask.component';
import Validators from 'd2-ui/lib/forms/Validators';
import camelCaseToUnderscores from 'd2-utilizr/lib/camelCaseToUnderscores'

import { toBuilderValidator, validateValues, validateUsername, validatePassword } from '../utils/validators';
import User from '../models/user';
import { getFromTemplate } from '../utils/template';
import snackActions from '../Snackbar/snack.actions';
import InfoDialog from './InfoDialog';

const styles = {
    dialog: {
        minWidth: 600,
        maxWidth: 800,
    },
    loadingStatusMask: {
        left: '45%',
        position: 'fixed',
        top: '45%',
    },
    infoDialog: {
        width: "100%",
        height: "100%",
    },
    infoDialogContents: {
        fontSize: "0.7em",
    },
};

class ReplicateUserDialog extends React.Component {
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
        const existingUsernames = await User.getExistingUsernames(d2);
        const userToReplicate = await User.getById(d2, userToReplicateId);
        const username = `${userToReplicate.username}_$index`;
        this.setState({
            existingUsernames,
            userToReplicate,
            username,
            password: this.defaultPassword,
            validate: true
        });
    }

    onUpdateField = (field, value) => {
        this.setState({ [field]: value, validate: true });
    }

    onUpdateFormStatus = (formStatus) => {
        const isValid = !formStatus.asyncValidating && formStatus.valid;
        this.setState({ isValid, validate: false });
    }

    closeInfoDialog = () => {
        this.setState({ infoDialog: null });
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
                    const usernamesFromTemplate = getFromTemplate(usernameTemplate, parseInt(usersToCreate) || 1);
                    const getInvalid = (username) => {
                        const index = _(usernamesFromTemplate).indexOf(username);
                        return new Set([
                            ..._(existingUsernames).toArray(),
                            ...usernamesFromTemplate.slice(0, index),
                            ...usernamesFromTemplate.slice(index + 1),
                        ]);
                    };

                    return validateValues(
                        usernamesFromTemplate,
                        username => validateUsername(getInvalid(username), username),
                    );
                },
                (username, error) => this.getTranslation(`username_${error}`, { username }),
            ),
            isValidPassword: toBuilderValidator(
                passwordTemplate => validateValues(
                    getFromTemplate(passwordTemplate, parseInt(this.state.usersToCreate) || 1),
                    password => validatePassword(password),
                ),
                (password, error) => this.getTranslation(`password_${error}`),
            ),
        };
    }

    getTextField(name, type, value, { validators }) {
        return {
            component: TextField,
            name,
            value,
            props: {
                type,
                style: { width: "100%" },
                floatingLabelText: this.getTranslation(camelCaseToUnderscores(name)),
            },
            validators,
        };
    }

    onSave = async () => {
        const { onRequestClose } = this.props;
        const { userToReplicate, usersToCreate, username, password } = this.state;
        const result = await userToReplicate.replicateFromTemplate(usersToCreate, username, password);

        if (result.success) {
            const message = this.getTranslation("replicate_successful",
                { user: userToReplicate.displayName, n: usersToCreate });
            snackActions.show({ message });
            onRequestClose();
        } else {
            const prettyJson = obj => JSON.stringify(obj, null, 2);
            const details = _([
                this.getTranslation("replicate_error_description"),
                result.error.message || "Unknown error",
                prettyJson(result.payload),
                prettyJson(result.response),
            ]).compact().join("\n\n");
            const infoDialog = {
                title: this.getTranslation("replicate_error"),
                body: (<pre style={styles.infoDialogContents}>{details}</pre>),
            };
            this.setState({ infoDialog });
        }
    }

    render() {
        const { onRequestClose } = this.props;
        const {
            infoDialog,
            userToReplicate,
            existingUsernames,
            usersToCreate,
            username,
            password,
            isValid,
            validate,
        } = this.state;
        const title = this.getTranslation("replicate_user",
            {user: userToReplicate ? userToReplicate.displayName : ""});
        const t = this.getTranslation;

        const actions = [
            <FlatButton label={this.getTranslation('cancel')} onClick={onRequestClose} style={{marginRight: 16}}/>,
            <RaisedButton primary={true} label={t('replicate')} disabled={!isValid} onClick={this.onSave} />,
        ];

        const fields = [
            this.getTextField("usersToCreate", "number", usersToCreate, {
                "validators": [this.validators.isRequired, this.validators.withinInterval(1, 50)],
            }),
            this.getTextField("username", "string", username, {
                "validators": [this.validators.isValidUsername],
            }),
            this.getTextField("password", "string", password, {
                "validators": [this.validators.isValidPassword],
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
                {!userToReplicate ? <LoadingMask style={styles.loadingStatusMask} /> : null}

                {infoDialog ?
                    <InfoDialog
                        title={infoDialog.title}
                        closeLabel={this.getTranslation("ok")}
                        onClose={this.closeInfoDialog}
                        style={styles.infoDialog}
                    >
                        {infoDialog.body}
                    </InfoDialog> : null}

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

ReplicateUserDialog.contextTypes = {
    d2: PropTypes.object.isRequired,
};

ReplicateUserDialog.propTypes = {
    userToReplicateId: PropTypes.string.isRequired,
    onRequestClose: PropTypes.func.isRequired,
};

export default ReplicateUserDialog;
