import React from 'react';
import PropTypes from 'prop-types';
import Dialog from 'material-ui/Dialog/Dialog';
import FlatButton from 'material-ui/FlatButton/FlatButton';
import TextField from 'material-ui/TextField/TextField';
import RaisedButton from 'material-ui/RaisedButton/RaisedButton';
import { Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn } from 'material-ui/Table';
import Chip from 'material-ui/Chip';
import Validators from 'd2-ui/lib/forms/Validators';
import FormBuilder from 'd2-ui/lib/forms/FormBuilder.component';
import { generateUid } from 'd2/lib/uid';
import { List } from 'immutable';
import _ from 'lodash';

import { toBuilderValidator, validateValues, validateUsername, validatePassword } from '../utils/validators';
import { getFromTemplate } from '../utils/template';
import User from '../models/user';
import snackActions from '../Snackbar/snack.actions';
import LoadingMask from '../loading-mask/LoadingMask.component';
import InfoDialog from './InfoDialog';

const styles = {
    dialog: {
        width: '95%',
        maxWidth: 'none',
    },
    addRowButton: {
        marginTop: 20,
        textAlign: "center",
    },
    header: {
        fontWeight: "bold",
        fontSize: "1.2em",
    },
    indexHeader: {
        width: 75,
    },
    actionsHeader: {
        width: 125,
    },
};
                                
class ReplicateUserFromTable extends React.Component {
    maxUsers = 100;

    constructor(props, context) {
        super(props);
        const { d2 } = context;
        this.t = d2.i18n.getTranslation.bind(d2.i18n);
        this.validators = this.getValidators();

        this.state = {
            invalidUsernames: null, // Set()
            infoDialog: null, // {title, body}
            usersValidation: {}, // {USER_ID: true | false}
            users: new List([]),
        };
    }

    async componentDidMount() {
        const { userToReplicateId } = this.props;
        const invalidUsernames = await User.getExistingUsernamesAndCodes(d2);
        const userToReplicate = await User.getById(d2, userToReplicateId);
        this.setState({ invalidUsernames, userToReplicate });
    }

    onUpdateField(index, name, value) {
        const { users } = this.state;
        const newUsers = users.set(index, { ...users.get(index), [name]: value });
        this.setState({ users: newUsers });
    }

    onUpdateFormStatus(index, formStatus) {
        const { users, usersValidation } = this.state;
        const isValid = !formStatus.asyncValidating && formStatus.valid;
        const user = users.get(index);
        this.setState({ usersValidation: { ...usersValidation, [user.id]: isValid} });
    }

    closeInfoDialog = () => {
        this.setState({ infoDialog: null });
    }

    getInvalidUsernames() {
        const { users, invalidUsernames } = this.state;
        const usernamesInTable = _(users.toJS()).map("username").compact().value();
        return new Set(Array.from(invalidUsernames).concat(usernamesInTable));
    }

    getValidators() {
        return {
            isRequired: {
                validator: Validators.isRequired,
                message: this.t(Validators.isRequired.message),
            },
            isValidEmail: {
                validator: Validators.isEmail,
                message: this.t(Validators.isEmail.message),
            },
            isValidUsername: toBuilderValidator(
                username => validateUsername(this.getInvalidUsernames(), username),
                (username, error) => this.t(`username_${error}`, { username }),
            ),
            isValidPassword: toBuilderValidator(
                password => validatePassword(password),
                (password, error) => this.t(`password_${error}`),
            ),
        };
    }

    getTextField(name, type, value, { validators }) {
        return {
            component: TextField,
            props: { name, type, style: { width: "100%" } },
            name: name,
            value: value || "",
            validators: validators,
        };
    }

    onSave = async () => {
        const { onRequestClose } = this.props;
        const { userToReplicate, users } = this.state;
        const response = await userToReplicate.replicateFromPlainFields(users.toJS());

        if (response.success) {
            const message = this.t("replicate_successful",
                { user: userToReplicate.displayName, n: users.size });
            snackActions.show({ message });
            onRequestClose();
        } else {
            this.setState({ infoDialog: { response } });
        }
    }

    getFields(index) {
        const { users } = this.state;
        const user = users.get(index);

        return [
            this.getTextField("username", "string", user.username, {
                "validators": [this.validators.isValidUsername],
            }),
            this.getTextField("password", "string", user.password, {
                "validators": [this.validators.isValidPassword],
            }),
            this.getTextField("firstName", "string", user.firstName, {
                "validators": [],
            }),
            this.getTextField("surname", "string", user.surname, {
                "validators": [],
            }),
            this.getTextField("email", "string", user.email, {
                "validators": [this.validators.isValidEmail],
            }),
        ];
    }

    addRow = () => {
        const { userToReplicate, usersValidation, users } = this.state;
        const invalidUsernames = this.getInvalidUsernames();
        const index = _.range(1, 1000)
            .find(i => !invalidUsernames.has(`${userToReplicate.username}_${i}`));
        const newUser = {
            id: generateUid(),
            username: `${userToReplicate.username}_${index}`,
            password: `District123_${index}`,
        };
        this.setState({
            users: users.push(newUser),
            usersValidation: { ...usersValidation, [newUser.id]: true },
        });
    }

    removeRow = (index) => {
        const { users } = this.state;
        this.setState({ users: users.remove(index) });
    }

    renderTableRow = ({ id: index, children }) => (
        <TableRow style={{border: "none"}}>
            <TableRowColumn style={styles.indexHeader}>
                <Chip>{index + 1}</Chip>
            </TableRowColumn>

            {children}

            <TableRowColumn style={styles.actionsHeader}>
                <RaisedButton
                    primary={true}
                    label={this.t('remove')}
                    onClick={() => this.removeRow(index)}
                />
            </TableRowColumn>
        </TableRow>
    );

    areUsersValid() {
        const { users, usersValidation } = this.state;
        return !users.isEmpty() && users.every(user => usersValidation[user.id]);
    }

    renderTable() {
        const { users } = this.state;
        const canAddNewUser = users.size < this.maxUsers;
        const headers = ["username", "password", "first_name", "surname", "email"];

        return (
            <div>
                <Table fixedHeader={true}>
                    <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
                        <TableRow>
                            <TableHeaderColumn style={styles.indexHeader}>#</TableHeaderColumn>
                            {headers.map(header =>
                                <TableHeaderColumn key={header} style={styles.header}>
                                    {this.t(header)}
                                </TableHeaderColumn>
                            )}
                            <TableHeaderColumn style={styles.actionsHeader}></TableHeaderColumn>
                        </TableRow>
                    </TableHeader>

                    <TableBody displayRowCheckbox={false}>
                        {_.map(users.toJS(), (user, index) =>
                            <FormBuilder key={"form-" + user.id}
                                id={index}
                                fields={this.getFields(index)}
                                onUpdateField={(...args) => this.onUpdateField(index, ...args)}
                                onUpdateFormStatus={(...args) => this.onUpdateFormStatus(index, ...args)}
                                validateOnRender={false}
                                mainWrapper={this.renderTableRow}
                                fieldWrapper={TableRowColumn}
                            />
                        )}
                    </TableBody>
                </Table>

                <div style={styles.addRowButton}>
                    <RaisedButton
                        primary={true}
                        disabled={!canAddNewUser}
                        label={this.t('add_user')}
                        onClick={this.addRow}
                    />
                </div>
            </div>
        );
    }

    render() {
        const { onRequestClose } = this.props;
        const { infoDialog, userToReplicate, invalidUsernames, users } = this.state;
        const title = this.t("replicate_user",
            {user: userToReplicate ? `${userToReplicate.displayName} (${userToReplicate.username})` : ""});

        const actions = [
            <RaisedButton
                primary={true}
                label={this.t('replicate')}
                disabled={!this.areUsersValid()}
                onClick={this.onSave}
            />,
            <FlatButton
                label={this.t('close')}
                onClick={onRequestClose}
            />,
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

                {infoDialog ?
                    <InfoDialog
                        t={this.t}
                        title={this.t("replicate_error")}
                        onClose={this.closeInfoDialog}
                        response={infoDialog.response}
                    /> : null}

                {this.renderTable()}
            </Dialog>
        );
    }
}

ReplicateUserFromTable.contextTypes = {
    d2: PropTypes.object.isRequired,
};

ReplicateUserFromTable.propTypes = {
    userToReplicateId: PropTypes.string.isRequired,
    onRequestClose: PropTypes.func.isRequired,
};

export default ReplicateUserFromTable;
