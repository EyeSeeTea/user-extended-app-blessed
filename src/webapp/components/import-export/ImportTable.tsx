import {
    FormControl,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
} from "@material-ui/core";
// @ts-ignore
import Validators from "d2-ui/lib/forms/Validators";
import _ from "lodash";
import { Chip, FontIcon, IconButton, TextField, RaisedButton } from "material-ui";
import { Switch } from "@material-ui/core";

// @ts-ignore
import React, { useEffect, useCallback, useMemo, ElementType } from "react";
import LoadingMask from "../../../legacy/loading-mask/LoadingMask.component";
import { fieldImportSuffix } from "../../../legacy/models/userHelpers";
import { toBuilderValidator, validatePassword, validateUsername } from "../../../legacy/utils/validators";
// import { Fields, FieldsProp } from "./FormBuilder";
import { Fields, FieldsProp, FormBuilder } from "./FormBuilder";
// import FormBuilder from "../../../legacy/components/FormBuilder.component";

import ModalLoadingMask from "../../../legacy/components/ModalLoadingMask.component";
import MultipleSelector from "../../../legacy/components/MultipleSelector.component";
import { generateUid } from "../../../utils/uid";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";
import { Id } from "../../../domain/entities/Ref";
import UserLegacy from "../../../legacy/models/user";
import { User } from "../../../domain/entities/User";
import { ApiUser } from "../../../data/repositories/UserD2ApiRepository";
import { OrderedMap } from "immutable";
import { OrgUnit } from "../../../domain/entities/OrgUnit";

const styles = {
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
        margin: 20,
        textAlign: "center" as const,
    },
    dialogIcons: {
        float: "right",
    },
    header: {
        width: 150,
        fontwWight: "bold",
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

export const ImportTable: React.FC<ImportTableProps> = React.memo(props => {
    const {
        columns,
        maxUsers,
        templateUser = null,
        settings,
        api,
        modelValuesByField,
        existingUsers,
        orgUnitRoots,
        users,
        updateUsers,
        validateOnRender: validateOnRenderProp,
        allowOverwrite,
        // forceRender = _.noop(),
        existingUsernames,
        // fieldsInfo,
    } = props;

    const { d2 } = useAppContext();
    // console.log("props", props);

    // const [existingUsernames, setExistingUsernames] = React.useState<Set<any>>(new Set([]));
    // const [isLoading, setIsLoading] = React.useState(true);
    const [isImporting, setIsImporting] = React.useState(false);
    // const [users, setUsers] = React.useState(usersProp);
    const [areUsersValid, setAreUsersValid] = React.useState<boolean | null>(null);
    const [multipleSelector, setMultipleSelector] = React.useState<{
        user: Partial<User>;
        field: string;
        selected: any;
        options: any;
    } | null>(null);
    const [validateOnRender, setValidateOnRender] = React.useState(false);

    console.log("users props", { users: users.valueSeq().toJS() });

    const getUsernamesInTable = useCallback(
        ({ skipId }: { skipId?: Id } = {}): Set<string> => {
            const usernames = _(users.valueSeq().toJS())
                .filter((user: User) => user.id !== skipId)
                // @ts-ignore
                .map<string>((user: User) => user.username)
                .compact()
                .value();
            return new Set(usernames as string[]);
        },
        [users]
    );

    const [fieldsInfo, setFieldsInfo] = React.useState<FieldsInfo>();
    const [usersValidation, setUsersValidation] = React.useState({});

    useEffect(
        () => {
            const buildUsersFields = () => {
                // setIsLoading(true);
                // const existingUsernamesSet = new Set(_.keys(existingUsers));
                // setExistingUsernames(existingUsernamesSet);
                setFieldsInfo(getFieldsInfo());
                // setIsLoading(false);
            };

            buildUsersFields();
        },
        [
            // users,
            // updateUsers,
            // allowOverwrite,
            // existingUsers,
            // existingUsernames,
            // getUsernamesInTable,
            // getUser
        ]
    );

    const getFieldsInfo = (): FieldsInfo => {
        const validators: Record<string, ValidatorsType> = {
            isRequired: {
                validator: Validators.isRequired,
                message: d2.i18n.getTranslation(Validators.isRequired.message),
            },
            isValidEmail: {
                validator: Validators.isEmail,
                message: d2.i18n.getTranslation(Validators.isEmail.message),
            },
            isUsernameNonExisting: toBuilderValidator(
                (username: string, userId: Id) =>
                    validateUsername(
                        allowOverwrite ? new Set() : existingUsernames,
                        getUsernamesInTable({ skipId: userId }),
                        username
                    ),
                (username: string, error: string): string => d2.i18n.getTranslation(`username_${error}`, { username })
            ) as ValidatorsType,
            isValidPassword: toBuilderValidator(
                (password: string, userId: Id) => {
                    // Existing users can have an empty password (so the current one is kept)
                    // const allowEmptyPassword = existingUsernames.has(users.get(userId)!.username);
                    const user = getUser(userId);
                    if (!user || !user.username) return { isValid: true };
                    const allowEmptyPassword = existingUsernames.has(user.username);
                    return validatePassword(password, { allowEmpty: allowEmptyPassword });
                },
                (_password: string, error: string) => d2.i18n.getTranslation(`password_${error}`)
            ) as ValidatorsType,
            importWarnings: (objField: string) =>
                toBuilderValidator(
                    (_value: string, userId: Id): ValidatorsType => {
                        const field = objField + fieldImportSuffix;
                        const isValid = { isValid: true };
                        const user = users.get(userId);
                        // @ts-ignore
                        if (!user) return isValid;
                        // @ts-ignore
                        const { hasDuplicates } = user[field] || {};
                        // @ts-ignore
                        return hasDuplicates ? { isValid: false } : isValid;
                    },
                    () => i18n.t("multiple_matches")
                ),
        };
        return {
            // @ts-ignore
            username: { validators: [validators.isUsernameNonExisting] },
            // @ts-ignore
            password: { validators: [validators.isValidPassword] },
            // @ts-ignore
            firstName: { validators: [validators.isRequired] },
            // @ts-ignore
            surname: { validators: [validators.isRequired] },
            // @ts-ignore
            email: { validators: [validators.isValidEmail] },
            // @ts-ignore
            organisationUnits: { validators: [validators.importWarnings("organisationUnits")] },
            dataViewOrganisationUnits: {
                // @ts-ignore
                validators: [validators.importWarnings("dataViewOrganisationUnits")],
            },
            searchOrganisationsUnits: {
                // @ts-ignore
                validators: [validators.importWarnings("searchOrganisationsUnits")],
            },
            _default: { validators: [] },
        };
    };

    const getUser = useCallback((userId: Id) => {
        const user = users.get(userId);

        if (user) {
            return user;
        } else {
            throw new Error("Cannot get user with ID: " + userId);
        }
    }, []);

    // FormBuilder usually validates only the current field, which is faster, but sometimes we
    // need to validate the form builder (i.e. checking uniqueness of fields). Call this method
    // whenever you want to fully validate the form.
    const validateOnNextRender = useCallback(
        (toValidate = true) => {
            setValidateOnRender(toValidate);
        },
        []
        // [setValidateOnRender]
    );

    const shouldValidateOnNextRender = () => {
        return validateOnRender;
    };

    const onUpdateField = (userId: Id, field: keyof Fields, value: any) => {
        const user = getUser(userId) as unknown as User;
        const importField = (field + fieldImportSuffix) as keyof User;
        const fieldHasImportData = !!user[importField] && typeof user[importField] === "object";

        const newUsers = users.set(userId, {
            ...user,
            [field]: value,
            ...(fieldHasImportData ? { [importField]: { ...(user[importField] as User), hasDuplicates: false } } : {}),
        });

        const validators = (fieldsInfo && fieldsInfo[field] && fieldsInfo[field].validators) || [];
        const shouldRender =
            fieldHasImportData ||
            !_.isEqual(
                validators.map((validator: any) => validator.validator(value, userId)),
                validators.map((validator: any) => validator.validator(user[field], userId))
            );

        updateUsers(newUsers);

        // if (shouldRender) {
        //     forceRender();
        // }
    };

    // const onUpdateField = React.useCallback(
    //     (userId: Id, field: string, value: any) => {
    //         const user = getUser(userId) as unknown as ApiUser;
    //         // Clear import warnings on field update
    //         const importField = (field + fieldImportSuffix) as keyof ApiUser;
    //         const fieldHasImportData = !!user[importField] && typeof user[importField] === "object";

    //         // @ts-ignore
    //         const newUsers = users.set(userId, {
    //             ...user,
    //             [field]: value,
    //             // @ts-ignore
    //             ...(fieldHasImportData ? { [importField]: { ...user[importField], hasDuplicates: false } } : {}),
    //         });

    //         const validators = (fieldsInfo && fieldsInfo[field] && fieldsInfo[field].validators) || [];
    //         // Force re-render if validations change so new error messages are shown
    //         const shouldRender =
    //             fieldHasImportData ||
    //             !_.isEqual(
    //                 validators.map((validator: any) => validator.validator(value, userId)),
    //                 // @ts-ignore
    //                 validators.map((validator: any) => validator.validator(user[field], userId))
    //             );

    //         // validateOnNextRender(shouldRender);
    //         updateUsers(newUsers);
    //         console.log("onUpdateField", {
    //             newUsers: newUsers.valueSeq().toJS(),
    //             users: users.valueSeq().toJS(),
    //             field,
    //             value,
    //         });
    //         if (shouldRender) {
    //             forceRender(new Date());
    //         }

    //         // Force a full validation when a username changed:
    //         //   1) to check uniqueness across the table
    //         //   2) to disable password validation on existing user
    //         if (field === "username") {
    //             validateOnNextRender();
    //         }
    //     },
    //     []
    //     // [fieldsInfo, getUser, setUsers, setForceRender, users, validateOnNextRender]
    // );

    const onUpdateFormStatus = useCallback(
        (userId: Id, formStatus: any) => {
            console.log("onUpdateFormStatus", { userId, formStatus });
            const isValid = !formStatus.asyncValidating && formStatus.valid;
            const newUsersValidation: Record<string, any> = { ...usersValidation, [userId]: isValid };
            setUsersValidation(newUsersValidation);
            // Call areUsersValid in parent
            setAreUsersValid(users.keySeq().every((userId: Id) => newUsersValidation[userId]));
        },
        []
        // [users, usersValidation]
    );

    const getInvalidUsernames = () => {
        return new Set(Array.from(existingUsernames).concat(Array.from(getUsernamesInTable())));
    };

    const onTextFieldClicked = useCallback(
        (userId: Id, field: string) => {
            const options = modelValuesByField[field];
            const user = getUser(userId);
            const selected = user[field as keyof Fields] || [];
            setMultipleSelector({ user, field, selected, options });
        },
        [getUser, modelValuesByField]
    );

    const getTextField = (
        name: keyof FieldsInfo,
        value: string,
        { validators, message, userId, component, extraProps }: any
    ) => {
        // console.log(!value?.length ? message : "");
        return {
            name,
            value: value || "",
            component: component || TextField,
            props: { name, type: "string", style: { width: "100%" }, ...extraProps },
            // errorText: !value?.length ? message : "",
            // errorText: validators
            //     .map(({ message, validator }: { message: string; validator: (arg: any) => boolean }) =>
            //         // @ts-ignore
            //         validator(value, userId) ? message : ""
            //     )
            //     .pop(),
            validators,
        };
    };

    const getFields = useCallback(
        (user: User) => {
            const relationshipFields: (keyof FieldsInfo)[] = [
                "userRoles",
                "userGroups",
                "organisationUnits",
                "dataViewOrganisationUnits",
                "searchOrganisationsUnits",
            ];

            const orgUnitsField = settings.get("organisationUnitsField");

            return columns.map((field: keyof FieldsInfo): FieldsProp => {
                // @ts-ignore
                const value = user[field];

                // const { validator, message } =
                //     fieldsInfo && fieldsInfo[field] ? fieldsInfo[field].validators : fieldsInfo._default.validators;
                const validators =
                    fieldsInfo && fieldsInfo[field] ? fieldsInfo[field].validators : fieldsInfo?._default.validators;
                // console.log({ field, value, message, validators });
                const isMultipleValue = relationshipFields.includes(field);
                const displayField =
                    field === "organisationUnits" ||
                    field === "dataViewOrganisationUnits" ||
                    field === "searchOrganisationsUnits"
                        ? orgUnitsField
                        : "displayName";

                if (isMultipleValue) {
                    const values = value || [];

                    const getCompactTextForCollection = (values: any, field: string) => {
                        return values.map((value: any) => value[field]).join(", ");
                    };

                    const compactValue = _(values).isEmpty()
                        ? "-"
                        : `[${values.length}] ` + getCompactTextForCollection(values, displayField);
                    const hoverText = _(values).map(displayField).join(", ");
                    // const onClick = onTextFieldClicked(user.id, field);
                    const onClick = (e: any) => {
                        console.log("clicked", e);
                        onTextFieldClicked(user.id, field);
                    };
                    // const onClick = (e: any) => console.log("clicked", e);

                    // @ts-ignore
                    return getTextField(field, compactValue, {
                        validators,
                        userId: user.id,
                        component: (props: any) => (
                            <TextField
                                {...props}
                                value={compactValue}
                                title={hoverText}
                                onClick={onClick}
                                onChange={onClick}
                            />
                        ),
                    });
                } else if (field === "disabled") {
                    return {
                        name: field,
                        component: Switch,
                        props: {
                            name: field,
                            // defaultToggled: value,
                            checked: Boolean(value),
                            onChange: (_event: React.MouseEvent<HTMLInputElement>, isInputChecked: boolean) => {
                                onUpdateField(user.id, field, isInputChecked);
                            },
                        },
                        // @ts-ignore
                        validators,
                    };
                } else {
                    const extraProps = { changeevent: "onBlur" };
                    // @ts-ignore
                    return getTextField(field, value, {
                        component: TextField,
                        validators,
                        userId: user.id,
                        extraProps,
                    });
                }
            });
        },
        []
        // [fieldsInfo]
    );

    const addRow = () => {
        let newUser: Partial<User>;

        if (templateUser) {
            const invalidUsernames = getInvalidUsernames();
            const index = _.range(1, 1000).find(i => !invalidUsernames.has(`${templateUser.username}_${i}`));
            newUser = {
                id: generateUid(),
                username: `${templateUser.username}_${index}`,
                password: `District123_${index}`,
                firstName: templateUser.attributes.firstName,
                surname: templateUser.attributes.surname,
                organisationUnits: templateUser.attributes.organisationUnits,
                dataViewOrganisationUnits: templateUser.attributes.dataViewOrganisationUnits,
                searchOrganisationsUnits: templateUser.attributes.searchOrganisationsUnits,
                email: templateUser.attributes.email,
                disabled: templateUser.attributes.disabled,
            };
        } else {
            newUser = {
                id: generateUid(),
                username: "",
                password: `District123$`,
            };
        }

        updateUsers(users.set(newUser.id!, newUser));
        validateOnNextRender();
    };

    const removeRow = React.useCallback(
        (userId: Id | readonly never[]) => {
            // @ts-ignore
            updateUsers(users => users.filter((_user: Partial<User>) => _user.id !== userId));
            setUsersValidation(prevUsersValidation => _.omit(prevUsersValidation, userId));
            validateOnNextRender();
        },
        [validateOnNextRender]
    );

    const getRemoveRowHandler = React.useCallback((userId: Id) => () => removeRow(userId), [removeRow]);

    const getOnUpdateField = useCallback(
        // @ts-ignore
        userId =>
            (...args: any) =>
                // @ts-ignore
                onUpdateField(userId, ...args),
        []
    );
    const getOnUpdateFormStatus = React.useCallback(
        userId =>
            (...args: any) =>
                // @ts-ignore
                onUpdateFormStatus(userId, ...args),
        [onUpdateFormStatus]
    );
    // @ts-ignore

    const getOnTextFieldClicked = React.useCallback((...args) => onTextFieldClicked(...args), [onTextFieldClicked]);

    const renderTableRow = useCallback(({ id: userId, children }: { id: Id; children: React.ReactNode }) => {
        const user = getUser(userId);
        if (!user || !user.username) {
            return null;
        }
        const index = users.keySeq().findIndex((_userId: any) => _userId === userId);
        const existingUser = existingUsers[user.username];
        const rowStyles = !allowOverwrite && existingUser ? styles.rowExistingUser : styles.row;
        const chipStyle = existingUser ? styles.chipExistingUser : undefined;
        const chipTitle = existingUser
            ? i18n.t("User already exists: {{id}}", { id: existingUser.id, nsSeparator: false })
            : "";
        const chipText = (index + 1).toString() + (existingUser ? "-E" : "");
        return (
            <TableRow style={rowStyles}>
                <TableCell>
                    <Tooltip title={chipTitle}>
                        <Chip style={chipStyle}>{chipText}</Chip>
                    </Tooltip>
                </TableCell>

                {children}

                <TableCell>
                    <IconButton
                        style={styles.removeIcon}
                        title={i18n.t("Remove user")}
                        onClick={() => getRemoveRowHandler(userId)}
                    >
                        <FontIcon className="material-icons">delete</FontIcon>
                    </IconButton>
                </TableCell>
            </TableRow>
        );
    }, []);

    const renderTableRowColumn = ({ children }: { children: React.ReactNode }) => {
        return <TableCell>{children}</TableCell>;
    };

    const renderTable = () => {
        const canAddNewUser = users.size < maxUsers;
        const headers = columns.map(_.startCase);
        // const headers = columns;
        const getColumnName = (header: string) => (_(d2.i18n.translations).has(header) ? i18n.t(header) : header);

        return (
            <TableContainer>
                <Table
                    stickyHeader={true}
                    // wrapperStyle={styles.tableWrapper}
                    style={styles.table}
                    // bodyStyle={styles.tableBody}
                >
                    <TableHead
                    // displaySelectAll={false}
                    // adjustForCheckbox={false}
                    >
                        <TableRow>
                            <TableCell style={styles.tableColumn}>#</TableCell>
                            {headers.map((header: string) => (
                                <TableCell key={header} style={styles.header}>
                                    {getColumnName(header)}
                                </TableCell>
                            ))}
                            <TableCell style={styles.actionsHeader}></TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody
                    // displayRowCheckbox={false}
                    >
                        {_.map(users.valueSeq().toJS(), (user: User) => {
                            return (
                                <FormBuilder
                                    key={"form-" + user.id}
                                    id={user.id}
                                    fields={getFields(user)}
                                    // onUpdateField={(v: any) => {
                                    //     console.log("onUpdateField", v);
                                    // }}
                                    onUpdateFormStatus={(v: any) => {
                                        // console.log("onUpdateFormStatus", v);
                                    }}
                                    // validateOnRender={shouldValidateOnNextRender()}
                                    validateOnRender={true}
                                    onUpdateField={getOnUpdateField(user.id)}
                                    // onUpdateField={(...args: any) => onUpdateField(user.id, ...args)}
                                    // onUpdateFormStatus={getOnUpdateFormStatus(user.id)}
                                    validateFullFormOnChanges={true}
                                    validateOnInitialRender={true}
                                    mainWrapper={renderTableRow}
                                    fieldWrapper={renderTableRowColumn}
                                />
                            );
                        })}
                    </TableBody>
                </Table>

                <div style={styles.addRowButton}>
                    <RaisedButton disabled={!canAddNewUser} label={i18n.t("add_user")} onClick={() => addRow} />
                </div>
            </TableContainer>
        );
    };

    const onMultipleSelectorClose = () => {
        setMultipleSelector(null);
    };

    const onMultipleSelectorChange = (selectedObjects: any, field: any, user: { id: any }) => {
        onUpdateField(user.id, field, selectedObjects);
        setMultipleSelector(null);
    };

    return (
        <div>
            {isImporting && <ModalLoadingMask />}
            {/* {isLoading ? <LoadingMask /> : renderTable()} */}
            {renderTable()}
            {multipleSelector && (
                <MultipleSelector
                    api={api}
                    field={multipleSelector.field}
                    selected={multipleSelector.selected}
                    options={multipleSelector.options}
                    onClose={onMultipleSelectorClose}
                    onChange={onMultipleSelectorChange}
                    data={multipleSelector.user}
                    orgUnitRoots={orgUnitRoots}
                />
            )}
        </div>
    );
});

type ImportTableProps = {
    api: any;
    usersFromFile: any;
    columns: (keyof FieldsInfo)[];
    maxUsers: number;
    templateUser?: UserLegacy;
    settings: any;
    warnings: string[];
    modelValuesByField: Record<string, any>;
    validateOnRender: boolean;
    users: OrderedMap<Id, Partial<User>>;
    existingUsers: Record<string, User>;
    orgUnitRoots: OrgUnit[] | null;
    updateUsers: (users: OrderedMap<Id, Partial<User>>) => void;
    allowOverwrite: boolean;
    existingUsernames: Set<string>;
};

type FieldsInfo = {
    [x in keyof Fields]: { validators: ValidatorsType[] };
} & {
    _default: { validators: [] };
};

type ValidatorsType =
    | {
          validator: Validators;
          message: string;
      }
    | Function;
