import React from "react";
import _ from "lodash";
import memoize from "memoize-weak";
import camelCaseToUnderscores from "d2-utilizr/lib/camelCaseToUnderscores";
import PropTypes from "prop-types";
import Dialog from "material-ui/Dialog/Dialog";
import FlatButton from "material-ui/FlatButton/FlatButton";
import TextField from "material-ui/TextField/TextField";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import {
    Table,
    TableBody,
    TableHeader,
    TableHeaderColumn,
    TableRow,
    TableRowColumn,
} from "material-ui/Table";
import Chip from "material-ui/Chip";
import Toggle from "material-ui/Toggle/Toggle";
import Validators from "d2-ui/lib/forms/Validators";
import FormBuilder from "d2-ui/lib/forms/FormBuilder.component";
import { generateUid } from "d2/lib/uid";
import { OrderedMap } from "immutable";
import FontIcon from "material-ui/FontIcon";
import IconButton from "material-ui/IconButton";

import { toBuilderValidator, validateUsername, validatePassword } from "../utils/validators";
import User from "../models/user";
import { getExistingUsers } from "../models/userHelpers";
import snackActions from "../Snackbar/snack.actions";
import ModalLoadingMask from "./ModalLoadingMask.component";
import LoadingMask from "../loading-mask/LoadingMask.component";
import InfoDialog from "./InfoDialog";
import MultipleSelector from "./MultipleSelector.component";
import { getModelValuesByField } from "../utils/dhis2Helpers";
import { getCompactTextForModels } from "../utils/i18n";
import { getOrgUnitsRoots } from "../utils/dhis2Helpers";

const styles = {
    dialog: {
        width: "95%",
        maxWidth: "none",
    },
    dialogBody: {
        paddingTop: "10px",
    },
    tableWrapper: {
        overflow: "visible",
    },
    table: {
        marginBottom: 5,
    },
    tableBody: {
        overflow: "visible",
    },
    addRowButton: {
        marginTop: 20,
        textAlign: "center",
    },
    dialogIcons: {
        float: "right",
    },
    dialogTitle: {
        margin: "0px 0px -1px",
        padding: "24px 24px 20px",
        fontSize: 24,
        fontWeight: "400",
        lineHeight: "32px",
        display: "inline",
    },
    header: {
        width: 150,
        fontWeight: "bold",
        fontSize: "1.2em",
        overflow: "hidden",
    },
    cell: {
        width: 150,
    },
    row: {
        border: "none",
    },
    rowExistingUser: {
        border: "none",
        backgroundColor: "#FDD",
    },
    chipExistingUser: {
        backgroundColor: "#FAA",
    },
    removeIcon: {
        cursor: "pointer",
    },
    warningsInfo: {
        textAlign: "left",
        float: "left",
        marginLeft: "20px",
    },
    overwriteToggle: {
        float: "left",
        textAlign: "left",
        width: "33%",
        marginLeft: "20px",
    },
    tableColumn: {
        width: 70,
    },
    actionsHeader: {
        width: 50,
        paddingLeft: "10px",
        paddingRight: "10px",
        overflow: "visible",
    },
    cancelButton: {
        marginRight: 16,
    },
};

class ImportTable extends React.Component {
    constructor(props, context) {
        super(props);

        const { d2 } = context;
        this.t = d2.i18n.getTranslation.bind(d2.i18n);
        this.getFieldsInfo = memoize(this.getFieldsInfo.bind(this));

        this.getRemoveRowHandler = memoize(userId => () => this.removeRow(userId));
        this.getOnUpdateField = memoize(userId => (...args) => this.onUpdateField(userId, ...args));
        this.getOnUpdateFormStatus = memoize(userId => (...args) =>
            this.onUpdateFormStatus(userId, ...args)
        );
        this.getActionsByState = memoize(this.getActionsByState.bind(this));
        this.getOnTextFieldClicked = memoize((...args) => ev => this.onTextFieldClicked(...args));

        this.fieldsInfo = this.getFieldsInfo();
        this.usersValidation = {}; // {USER_ID: true | false}
        this.validateOnNextRender();

        this.state = {
            existingUsers: null, // Array
            existingUsernames: null, // Set()
            infoDialog: null, // {title, body}
            isLoading: true,
            isImporting: false,
            users: new OrderedMap(),
            areUsersValid: null,
            allowOverwrite: false,
            multipleSelector: null,
            modelValuesByField: null,
            forceRender: null,
        };
    }

    async componentDidMount() {
        const { d2 } = this.context;
        const { users: usersArray, columns } = this.props;

        const modelValuesByField = await getModelValuesByField(d2, columns);
        const orgUnitRoots = await getOrgUnitsRoots();
        const existingUsers = await getExistingUsers(d2);
        const getUsername = user => user.userCredentials.username;
        const existingUsernames = new Set(existingUsers.map(getUsername));

        const usersById = _(usersArray)
            .sortBy(user => !existingUsernames.has(user.username))
            .map(user => ({ id: generateUid(), ...user }))
            .map(user => [user.id, user])
            .value();

        this.setState({
            isLoading: false,
            existingUsers: _.keyBy(existingUsers, getUsername),
            existingUsernames,
            users: new OrderedMap(usersById),
            modelValuesByField,
            orgUnitRoots,
        });
    }

    getActionsByState(allowOverwrite, showOverwriteToggle, showProcessButton) {
        const { onRequestClose, actionText, templateUser } = this.props;

        return _.compact([
            showOverwriteToggle && !templateUser && (
                <Toggle
                    label={this.t("overwrite_existing_users")}
                    labelPosition="right"
                    toggled={allowOverwrite}
                    onToggle={this.toggleAllowOverwrite}
                    style={styles.overwriteToggle}
                />
            ),
            <FlatButton
                label={this.t("close")}
                onClick={onRequestClose}
                style={styles.cancelButton}
            />,
            <RaisedButton
                primary={true}
                label={actionText}
                disabled={!showProcessButton}
                onClick={this.onSave}
            />,
        ]);
    }

    getUser(userId) {
        const { users } = this.state;
        const user = users.get(userId);

        if (user) {
            return user;
        } else {
            throw new Error("Cannot get user with ID: " + userId);
        }
    }

    // FormBuilder usually validates only the current field, which is faster, but sometimes we
    // need to validate the form builder (i.e. checking uniqueness of fields). Call this method
    // whenever you want to fully validate the form.
    validateOnNextRender(toValidate = true) {
        this.validateOnRender = toValidate;
    }

    shouldValidateOnNextRender() {
        return this.validateOnRender;
    }

    onUpdateField(userId, name, value) {
        const { users } = this.state;
        const user = this.getUser(userId);
        const newUsers = users.set(userId, { ...user, [name]: value });
        const validators = (this.getFieldsInfo()[name] || {}).validators || [];
        // Force re-render if validations change so new error messages are shown
        const shouldRender = !_.isEqual(
            validators.map(validator => validator.validator(value, userId)),
            validators.map(validator => validator.validator(user[name], userId))
        );

        this.validateOnNextRender(shouldRender);
        this.setState({ users: newUsers, ...(shouldRender ? { forceRender: new Date() } : {}) });

        // Force a full validation when a username changed:
        //   1) to check uniqueness across the table
        //   2) to disable password validation on existing user
        if (name === "username") {
            this.validateOnNextRender();
        }
    }

    onUpdateFormStatus(userId, formStatus) {
        const { users } = this.state;
        const { usersValidation } = this;
        const isValid = !formStatus.asyncValidating && formStatus.valid;
        const newUsersValidation = { ...usersValidation, [userId]: isValid };
        this.usersValidation = newUsersValidation;
        const areUsersValid = users.keySeq().every(userId => newUsersValidation[userId]);
        this.setState({ areUsersValid });
    }

    shouldComponentUpdate(nextProps, nextState) {
        /*
            Problem: Without a custom shouldComponentUpdate, any change of a form field
            issues a re-render of the whole table.

            Solution: Prevent an update if the only change comes from an update of already existing
            nextState.users. This works because a FormBuilder renders values from its inner state,
            so it's not necessary to pass down the new values (through props) to see the changes.
        */
        const changedStateKeys = _(this.state)
            .map((value, key) => (nextState[key] !== value ? key : null))
            .compact()
            .value();

        const changeInExistingUsernames = !_.isEqual(
            this.getUsersWithExistingUsername(this.state.users, this.state.existingUsernames),
            this.getUsersWithExistingUsername(nextState.users, nextState.existingUsernames)
        );

        const changeInDuplicatedUsernames = !_.isEqual(
            this.getUsersWithDuplicatedUsername(this.state.users),
            this.getUsersWithDuplicatedUsername(nextState.users)
        );

        const updateFromProps = this.props !== nextProps;
        const updateFromState = !(
            !changeInExistingUsernames &&
            !changeInDuplicatedUsernames &&
            _(changedStateKeys).isEqual(["users"]) &&
            this.state.users.keySeq().equals(nextState.users.keySeq())
        );

        return updateFromProps || updateFromState;
    }

    closeInfoDialog = () => {
        this.setState({ infoDialog: null });
    };

    getUsersWithExistingUsername(users, existingUsernames) {
        return _(users.valueSeq().toJS())
            .filter(user => existingUsernames.has(user.username))
            .map("id")
            .value();
    }

    getUsersWithDuplicatedUsername(users) {
        return _(users.valueSeq().toJS())
            .groupBy("username")
            .flatMap((usersWithUsername, username) =>
                usersWithUsername.length > 1 ? usersWithUsername : []
            )
            .map("id")
            .value();
    }

    getUsernamesInTable({ skipId } = {}) {
        const { users } = this.state;
        const usernames = _(users.valueSeq().toJS())
            .map(user => (user.id !== skipId ? user.username : null))
            .compact()
            .value();
        return new Set(usernames);
    }

    getInvalidUsernames() {
        return new Set(
            Array.from(this.state.existingUsernames).concat(Array.from(this.getUsernamesInTable()))
        );
    }

    getFieldsInfo() {
        const validators = {
            isRequired: {
                validator: Validators.isRequired,
                message: this.t(Validators.isRequired.message),
            },
            isValidEmail: {
                validator: Validators.isEmail,
                message: this.t(Validators.isEmail.message),
            },
            isUsernameNonExisting: toBuilderValidator(
                (username, userId) =>
                    validateUsername(
                        this.state.allowOverwrite ? new Set() : this.state.existingUsernames,
                        this.getUsernamesInTable({ skipId: userId }),
                        username
                    ),
                (username, error) => this.t(`username_${error}`, { username })
            ),
            isValidPassword: toBuilderValidator(
                (password, userId) => {
                    // Existing users can have an empty password (so the current one is kept)
                    const { users, existingUsernames } = this.state;
                    const allowEmptyPassword = existingUsernames.has(users.get(userId).username);
                    return validatePassword(password, { allowEmpty: allowEmptyPassword });
                },
                (password, error) => this.t(`password_${error}`)
            ),
        };

        return {
            username: { validators: [validators.isUsernameNonExisting] },
            password: { validators: [validators.isValidPassword] },
            firstName: { validators: [validators.isRequired] },
            surname: { validators: [validators.isRequired] },
            email: { validators: [validators.isValidEmail] },
            _default: { validators: [] },
        };
    }

    getColumns() {
        return this.props.columns;
    }

    onTextFieldClicked = (userId, field) => {
        const { users, modelValuesByField } = this.state;
        const options = modelValuesByField[field];
        const user = this.getUser(userId);
        const selected = user[field] || [];

        this.setState({
            multipleSelector: { user, field, selected, options },
        });
    };

    getTextField(name, value, { validators, component, extraProps }) {
        return {
            name,
            value: value || "",
            component: component || TextField,
            props: { name, type: "string", style: { width: "100%" }, ...extraProps },
            validators,
        };
    }

    getFields(user) {
        const relationshipFields = [
            "userRoles",
            "userGroups",
            "organisationUnits",
            "dataViewOrganisationUnits",
        ];

        return this.getColumns().map(field => {
            const value = user[field];
            const validators = (this.fieldsInfo[field] || this.fieldsInfo._default).validators;
            const isMultipleValue = relationshipFields.includes(field);

            if (isMultipleValue) {
                const values = value || [];
                const compactValue = _(values).isEmpty()
                    ? "-"
                    : `[${values.length}] ` +
                      getCompactTextForModels(this.context.d2, values, { limit: 1 });
                const hoverText = _(values)
                    .map("displayName")
                    .join(", ");
                const onClick = this.getOnTextFieldClicked(user.id, field);

                return this.getTextField(field, compactValue, {
                    validators,
                    component: props => (
                        <TextField
                            {...props}
                            value={compactValue}
                            title={hoverText}
                            onClick={onClick}
                            onChange={onClick}
                        />
                    ),
                });
            } else {
                const extraProps = { changeEvent: "onBlur" };
                return this.getTextField(field, value, {
                    component: TextField,
                    validators,
                    extraProps,
                });
            }
        });
    }

    addRow = () => {
        const { templateUser } = this.props;
        const { users } = this.state;
        const { usersValidation } = this;
        let newUser;

        if (templateUser) {
            const invalidUsernames = this.getInvalidUsernames();
            const index = _.range(1, 1000).find(
                i => !invalidUsernames.has(`${templateUser.username}_${i}`)
            );
            newUser = {
                id: generateUid(),
                username: `${templateUser.username}_${index}`,
                password: `District123_${index}`,
                firstName: templateUser.attributes.firstName,
                surname: templateUser.attributes.surname,
                organisationUnits: templateUser.attributes.organisationUnits,
                dataViewOrganisationUnits: templateUser.attributes.dataViewOrganisationUnits,
                email: templateUser.attributes.email,
            };
        } else {
            newUser = {
                id: generateUid(),
                username: "",
                password: `District123$`,
            };
        }

        this.setState({ users: users.set(newUser.id, newUser) });
        this.validateOnNextRender();
    };

    removeRow = userId => {
        const { users } = this.state;
        const { usersValidation } = this;

        this.setState({ users: users.remove(userId) });
        this.usersValidation = _(usersValidation)
            .omit(userId)
            .value();
        this.validateOnNextRender();
    };

    renderTableRow = ({ id: userId, children }) => {
        const { users, existingUsers, existingUsernames, allowOverwrite } = this.state;
        const user = this.getUser(userId);
        const index = users.keySeq().findIndex(_userId => _userId === userId);
        const existingUser = existingUsers[user.username];
        const rowStyles = !allowOverwrite && existingUser ? styles.rowExistingUser : styles.row;
        const chipStyle = existingUser ? styles.chipExistingUser : undefined;
        const chipTitle = existingUser ? this.t("user_exists", { id: existingUser.id }) : undefined;
        const chipText = (index + 1).toString() + (existingUser ? "-E" : "");

        return (
            <TableRow style={rowStyles}>
                <TableRowColumn style={styles.tableColumn}>
                    <Chip title={chipTitle} style={chipStyle}>
                        {chipText}
                    </Chip>
                </TableRowColumn>

                {children}

                <TableRowColumn style={styles.actionsHeader}>
                    <IconButton
                        style={styles.removeIcon}
                        title={this.t("remove_user")}
                        onClick={this.getRemoveRowHandler(userId)}
                    >
                        <FontIcon className="material-icons">delete</FontIcon>
                    </IconButton>
                </TableRowColumn>
            </TableRow>
        );
    };

    componentDidUpdate() {
        // After a render, unset validateOnRender to avoid infinite loops of FormBuilder render/validation
        this.validateOnNextRender(this.state.isLoading);
    }

    renderTableRowColumn({ children }) {
        return <TableRowColumn style={styles.cell}>{children}</TableRowColumn>;
    }

    renderTable() {
        const { d2 } = this.context;
        const { users } = this.state;
        const { maxUsers } = this.props;
        const canAddNewUser = users.size < maxUsers;
        const headers = this.getColumns().map(camelCaseToUnderscores);
        const getColumnName = header =>
            _(d2.i18n.translations).has(header) ? this.t(header) : header;

        return (
            <div>
                <Table
                    fixedHeader={true}
                    wrapperStyle={styles.tableWrapper}
                    style={styles.table}
                    bodyStyle={styles.tableBody}
                >
                    <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
                        <TableRow>
                            <TableHeaderColumn style={styles.tableColumn}>#</TableHeaderColumn>
                            {headers.map(header => (
                                <TableHeaderColumn key={header} style={styles.header}>
                                    {getColumnName(header)}
                                </TableHeaderColumn>
                            ))}
                            <TableHeaderColumn style={styles.actionsHeader}></TableHeaderColumn>
                        </TableRow>
                    </TableHeader>

                    <TableBody displayRowCheckbox={false}>
                        {_.map(users.valueSeq().toJS(), user => (
                            <FormBuilder
                                key={"form-" + user.id}
                                id={user.id}
                                fields={this.getFields(user)}
                                onUpdateField={this.getOnUpdateField(user.id)}
                                onUpdateFormStatus={this.getOnUpdateFormStatus(user.id)}
                                validateOnRender={this.shouldValidateOnNextRender()}
                                validateFullFormOnChanges={true}
                                validateOnInitialRender={true}
                                mainWrapper={this.renderTableRow}
                                fieldWrapper={this.renderTableRowColumn}
                            />
                        ))}
                    </TableBody>
                </Table>

                <div style={styles.addRowButton}>
                    <RaisedButton
                        disabled={!canAddNewUser}
                        label={this.t("add_user")}
                        onClick={this.addRow}
                    />
                </div>
            </div>
        );
    }

    onSave = async () => {
        const { users } = this.state;
        const { onRequestClose, onSave } = this.props;

        this.setState({ isImporting: true });

        try {
            const errorResponse = await onSave(users.valueSeq().toJS());
            if (errorResponse) {
                this.setState({ isImporting: false, infoDialog: { response: errorResponse } });
            } else {
                onRequestClose();
            }
        } catch (err) {
            console.error(err);
            this.setState({ isImporting: false });
        }
    };

    toggleAllowOverwrite = () => {
        this.setState({
            allowOverwrite: !this.state.allowOverwrite,
        });
        this.validateOnNextRender();
    };

    onMultipleSelectorClose = () => {
        this.setState({ multipleSelector: null });
    };

    onMultipleSelectorChange = (selectedObjects, field, user) => {
        this.onUpdateField(user.id, field, selectedObjects);
        this.setState({ multipleSelector: null });
    };

    renderDialogTitle() {
        const { title, warnings } = this.props;
        const errorsCount = _(this.usersValidation)
            .values()
            .sumBy(isValid => (isValid ? 0 : 1));
        const errorText = errorsCount === 0 ? null : this.t("errors_on_table", { n: errorsCount });
        const maxWarnings = 10;
        const hiddenWarnings = Math.max(warnings.length - maxWarnings, 0);

        const warningText =
            warnings.length === 0
                ? null
                : _([
                      this.t("warnings", { n: warnings.length }) + ":",
                      ..._(warnings)
                          .take(maxWarnings)
                          .map((line, idx) => `${idx + 1}. ${line}`),
                      hiddenWarnings > 0
                          ? this.t("and_n_more_warnings", { n: hiddenWarnings })
                          : null,
                  ])
                      .compact()
                      .join("\n");

        return (
            <div>
                <h3 style={styles.dialogTitle}>{title}</h3>
                {errorText && (
                    <span title={errorText} style={styles.dialogIcons}>
                        <FontIcon className="material-icons">error</FontIcon>
                    </span>
                )}
                {warningText && (
                    <span title={warningText} style={styles.dialogIcons}>
                        <FontIcon className="material-icons">warning</FontIcon>
                    </span>
                )}
            </div>
        );
    }

    getDuplicatedUsernamesExist(users, existingUsernames) {
        return users.valueSeq().some(user => existingUsernames.has(user.username));
    }

    render() {
        const { onRequestClose, onSave } = this.props;
        const {
            infoDialog,
            users,
            isLoading,
            existingUsernames,
            allowOverwrite,
            areUsersValid,
            isImporting,
        } = this.state;
        const { multipleSelector, modelValuesByField, orgUnitRoots } = this.state;

        const duplicatedUsernamesExist = this.getDuplicatedUsernamesExist(users, existingUsernames);
        const showProcessButton = !users.isEmpty() && areUsersValid;
        const actions = this.getActionsByState(
            allowOverwrite,
            duplicatedUsernamesExist,
            showProcessButton
        );
        const dialogTitle = this.renderDialogTitle();

        return (
            <Dialog
                open={true}
                modal={true}
                title={dialogTitle}
                actions={actions}
                autoScrollBodyContent={true}
                autoDetectWindowHeight={true}
                contentStyle={styles.dialog}
                bodyStyle={styles.dialogBody}
                onRequestClose={onRequestClose}
            >
                {isImporting && <ModalLoadingMask />}

                {isLoading ? <LoadingMask /> : this.renderTable()}

                {multipleSelector && (
                    <MultipleSelector
                        field={multipleSelector.field}
                        selected={multipleSelector.selected}
                        options={multipleSelector.options}
                        onClose={this.onMultipleSelectorClose}
                        onChange={this.onMultipleSelectorChange}
                        data={multipleSelector.user}
                        orgUnitRoots={orgUnitRoots}
                    />
                )}

                {infoDialog && (
                    <InfoDialog
                        t={this.t}
                        title={this.t("metadata_error")}
                        onClose={this.closeInfoDialog}
                        response={infoDialog.response}
                    />
                )}
            </Dialog>
        );
    }
}

ImportTable.contextTypes = {
    d2: PropTypes.object.isRequired,
};

ImportTable.propTypes = {
    title: PropTypes.string.isRequired,
    initialUsers: PropTypes.arrayOf(PropTypes.object),
    onSave: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func.isRequired,
    templateUser: PropTypes.object,
    maxUsers: PropTypes.number,
    actionText: PropTypes.string.isRequired,
    columns: PropTypes.arrayOf(PropTypes.string).isRequired,
    warnings: PropTypes.arrayOf(PropTypes.string),
};

ImportTable.defaultProps = {
    initialUsers: [],
    templateUser: null,
    maxUsers: null,
    warnings: [],
};

export default ImportTable;
