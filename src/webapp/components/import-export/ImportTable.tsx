import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import _ from "lodash";
import { FontIcon, RaisedButton } from "material-ui";
import { Toggle } from "material-ui/Toggle";

import React, { useState, useEffect, useCallback, SetStateAction } from "react";
import LoadingMask from "../../../legacy/loading-mask/LoadingMask.component";
import { getExistingUsers } from "../../../legacy/models/userHelpers";
import { Fields } from "./FormBuilder";
// import { validateUsername } from "../../../legacy/utils/validators";

import InfoDialog from "../../../legacy/components/InfoDialog";
import ModalLoadingMask from "../../../legacy/components/ModalLoadingMask.component";
import { generateUid } from "../../../utils/uid";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";
import UserLegacy from "../../../legacy/models/user";
import { ApiUser } from "../../../data/repositories/UserD2ApiRepository";
import {
    CheckboxFieldFF,
    composeValidators,
    createMaxCharacterLength,
    createMinCharacterLength,
    createPattern,
    hasValue,
    string,
} from "@dhis2/ui";
import { MetadataResponse } from "@eyeseetea/d2-api/2.36";
import { useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import {
    TableRow,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableContainer,
    Tooltip,
} from "@material-ui/core";
// import { Delete, ViewColumn } from "@material-ui/icons";
import { IconButton, Chip } from "material-ui";
import { Form, FormSpy, useForm } from "react-final-form";
import { defaultUser, User } from "../../../domain/entities/User";
import { ColumnSelectorDialog } from "../column-selector-dialog/ColumnSelectorDialog";
import { UserFormField, getUserFieldName, userFormFields } from "../user-form/utils";
import { UserRoleGroupFF } from "../user-form/components/UserRoleGroupFF";
import { OrgUnitSelectorFF } from "../user-form/components/OrgUnitSelectorFF";
import { PreviewInputFF } from "../form/fields/PreviewInputFF";
import { ComponentProps, ComponentType } from "react";
import { Field, UseFieldConfig } from "react-final-form";

type FormFieldProps<FieldValue, T extends ComponentType<any>> = UseFieldConfig<FieldValue> &
    Omit<ComponentProps<T>, "input" | "meta"> & {
        name: string;
        component: T;
        value?: FieldValue;
        initialValue?: FieldValue;
        defaultValue?: FieldValue;
    };

const styles = {
    dialogIcons: {
        float: "right",
    },
    dialogTitle: {
        margin: "0px 0px -1px",
        padding: "24px 24px 20px",
        fontsize: 24,
        fontweight: "400",
        lineheight: "32px",
        display: "inline",
    },
    overwriteToggle: {
        float: "left",
        textalign: "left",
        width: "33%",
        marginleft: "20px",
    },
    // Table
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

export const ImportDialog: React.FC<ImportTableProps> = props => {
    const {
        title,
        usersFromFile,
        columns: baseUserColumns,
        maxUsers,
        onSave,
        onRequestClose,
        templateUser = null,
        settings,
        api,
        actionText,
        warnings = [],
    } = props;

    const { compositionRoot, d2 } = useAppContext();

    const [existingUsers, setExistingUsers] = React.useState<Record<string, User>>({});
    const [existingUsersNames, setExistingUsersNames] = React.useState<string[]>([]);
    const [infoDialog, setInfoDialog] = React.useState<{ title: string; body: string; response: string } | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isImporting, setIsImporting] = React.useState(false);
    // const [users, setUsers] = React.useState(OrderedMap<Id, Pick<User, keyof Fields>>([]));
    const [allowOverwrite, setAllowOverwrite] = React.useState(false);

    const loading = useLoading();
    const snackbar = useSnackbar();
    const [users, setUsers] = useState<User[]>(usersFromFile);
    const [summary, setSummary] = useState<MetadataResponse[]>();
    const [columns, setColumns] = useState<string[]>(baseUserColumns);
    const [columnSelectorOpen, setColumnSelectorOpen] = useState<boolean>(false);

    const [showOverwriteToggle, setShowOverwriteToggle] = React.useState(false);
    const [usersValidation, setUsersValidation] = React.useState({});
    // console.log({ props });
    const getUsername = (user: ApiUser | User): string => {
        if ("userCredentials" in user) {
            return user.userCredentials.username;
        } else {
            return user.username;
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [existingUsersD2]: [UserLegacy[]] = await Promise.all([getExistingUsers(d2)]);
            const existingUsersMapped = _.keyBy(existingUsersD2, getUsername) as Record<string, UserLegacy>;
            setExistingUsers(existingUsersMapped as unknown as SetStateAction<Record<string, User>>);
            setExistingUsersNames(existingUsersD2.map((_user: Partial<UserLegacy>) => getUsername(_user as ApiUser)));
            setIsLoading(false);
        };

        fetchData();
    }, [d2]);

    const closeInfoDialog = () => {
        setInfoDialog(null);
    };

    // const onSaveTable = async () => {
    //     setIsImporting(true);
    //     try {
    //         // @ts-ignore
    //         const errorResponse = await onSave(users.valueSeq().toJS());
    //         if (errorResponse) {
    //             setIsImporting(false);
    //             // @ts-ignore
    //             setInfoDialog({ response: errorResponse });
    //         } else {
    //             onRequestClose();
    //         }
    //     } catch (err) {
    //         console.error(err);
    //         setIsImporting(false);
    //     }
    // };

    const toggleAllowOverwrite = () => {
        setAllowOverwrite(!allowOverwrite);
    };

    const renderDialogTitle = () => {
        const errorsCount = _(usersValidation)
            .values()
            .sumBy(isValid => (isValid ? 0 : 1));
        const errorText =
            errorsCount === 0
                ? null
                : i18n.t("{{n}} invalid users found, check in-line errors in table", { n: errorsCount });
        const maxWarnings = 10;
        const hiddenWarnings = Math.max(warnings.length - maxWarnings, 0);

        const warningText =
            warnings.length === 0
                ? null
                : _([
                      i18n.t("{{n}} warning(s) while importing file", { n: warnings.length }) + ":",
                      // @ts-ignore
                      ..._(warnings)
                          .take(maxWarnings)
                          .map((line, idx) => `${idx + 1}. ${line}`),
                      hiddenWarnings > 0 ? i18n.t("and_n_more_warnings", { n: hiddenWarnings }) : null,
                  ])
                      .compact()
                      .join("\n");

        return (
            <div>
                <h3 style={styles.dialogTitle}>{title}</h3>
                {errorText && (
                    // @ts-ignore
                    <span title={errorText} style={styles.dialogIcons}>
                        <FontIcon className="material-icons">error</FontIcon>
                    </span>
                )}
                {warningText && (
                    // @ts-ignore
                    <span title={warningText} style={styles.dialogIcons}>
                        <FontIcon className="material-icons">warning</FontIcon>
                    </span>
                )}
            </div>
        );
    };

    const onSubmit = useCallback(
        async ({ users }: { users: User[] }) => {
            loading.show(true, i18n.t("Saving users"));

            // const { data, error } = await compositionRoot.users.save(users).runAsync();
            const { data, error } = await Promise.resolve({ data: { status: "OK" }, error: null });
            console.log("onSubmit", { users });
            loading.reset();

            if (error) {
                snackbar.error(error);
                return error;
            }

            if (data && data.status === "ERROR") {
                // @ts-ignore
                setSummary([data]);
            } else {
                // close
            }
        },
        [snackbar, loading]
    );

    const addRow = useCallback(() => {
        const newUser = {
            ...defaultUser,
            id: generateUid(),
            username: "",
            password: `District123$`,
        };

        setUsers(users => users.concat(newUser));
    }, []);

    const closeSummary = () => setSummary(undefined);
    let submit: any;

    const renderTableRow = (user: User, rowIndex: number) => {
        const existingUser = existingUsers[user.username];
        const rowStyles = !allowOverwrite && existingUser ? styles.rowExistingUser : styles.row;
        const chipStyle = existingUser ? styles.chipExistingUser : undefined;
        const chipTitle = existingUser
            ? i18n.t("User already exists: {{id}}", { id: existingUser.id, nsSeparator: false })
            : "";
        const chipText = (rowIndex + 1).toString() + (existingUser ? "-E" : "");
        return (
            <TableRow key={rowIndex} style={rowStyles}>
                <TableCell>
                    <Tooltip title={chipTitle}>
                        <Chip style={chipStyle}>{chipText}</Chip>
                    </Tooltip>
                </TableCell>

                {_(columns)
                    .map((value, columnIndex) => (
                        <TableCell style={styles.row} key={`${rowIndex}-${columnIndex}-${value}`}>
                            <RowItem
                                key={`${rowIndex}-${columnIndex}-${value}`}
                                rowIndex={rowIndex}
                                columnIndex={columnIndex}
                                data={{ columns, existingUsersNames }}
                            />
                        </TableCell>
                    ))
                    .value()}
            </TableRow>
        );
    };

    const updateFormState = (arg: any) => {
        console.log("updateFormState", arg);
    };

    return (
        <ConfirmationDialog
            open={true}
            title={renderDialogTitle()}
            maxWidth={"lg"}
            fullWidth={true}
            cancelText={i18n.t("Close")}
            onCancel={onRequestClose}
            saveText={actionText}
            onSave={event => submit(event)}

            // disableSave={_.isEmpty(users) || !areUsersValid}
        >
            {isImporting && <ModalLoadingMask />}

            {isLoading ? (
                <LoadingMask />
            ) : (
                <div>
                    {columnSelectorOpen && (
                        <ColumnSelectorDialog
                            columns={userFormFields}
                            visibleColumns={columns}
                            onChange={setColumns}
                            getName={getUserFieldName}
                            onCancel={() => setColumnSelectorOpen(false)}
                        />
                    )}
                    <TableContainer>
                        <Form<{ users: User[] }>
                            autocomplete="off"
                            onSubmit={onSubmit}
                            initialValues={{ users }}
                            render={({ handleSubmit, values, submitError }) => {
                                submit = handleSubmit;
                                return (
                                    <>
                                        <FormSpy onChange={updateFormState} />

                                        <form onSubmit={submit}>
                                            <Table
                                                stickyHeader={true}
                                                style={styles.table}
                                                // bodyStyle={styles.tableBody}
                                                // wrapperStyle={styles.tableWrapper}
                                            >
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell style={styles.tableColumn}>#</TableCell>
                                                        {columns.map((header: string) => (
                                                            <TableCell key={header} style={styles.header}>
                                                                {header}
                                                            </TableCell>
                                                        ))}
                                                        <TableCell style={styles.actionsHeader}>D</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody style={styles.tableBody}>
                                                    {_.map(users, (user: User, rowIndex) =>
                                                        renderTableRow(user, rowIndex)
                                                    )}
                                                </TableBody>
                                            </Table>

                                            {/* {submitError && (
                                            <NoticeBox title={i18n.t("Error saving users")} error={true}>
                                                {submitError}
                                            </NoticeBox>
                                            )}*/}
                                            <div style={styles.addRowButton}>
                                                <RaisedButton
                                                    // disabled={!canAddNewUser}
                                                    label={i18n.t("Add user")}
                                                    onClick={addRow}
                                                />
                                            </div>
                                        </form>
                                    </>
                                );
                            }}
                        />
                    </TableContainer>
                </div>
            )}

            {infoDialog && (
                <InfoDialog
                    t={i18n.t}
                    title={i18n.t("Error on metadata action")}
                    onClose={() => closeInfoDialog()}
                    response={infoDialog.response}
                />
            )}

            {showOverwriteToggle && !templateUser && (
                <Toggle
                    label={i18n.t("Overwrite existing users")}
                    labelPosition="right"
                    toggled={allowOverwrite}
                    onToggle={toggleAllowOverwrite}
                    // @ts-ignore
                    style={styles.overwriteToggle}
                />
            )}
        </ConfirmationDialog>
    );
};

type ImportTableProps = {
    title: string;
    usersFromFile: User[];
    columns: (keyof Fields)[];
    maxUsers: number;
    onSave: (users: UserLegacy[]) => Promise<any>;
    onRequestClose: () => void;
    templateUser?: UserLegacy;
    settings: any;
    api: any;
    actionText: string;
    warnings: string[];
};

type RowItemProps = {
    data: { columns: string[]; existingUsersNames: string[] };
    columnIndex: number;
    rowIndex: number;
};

const RowItem: React.FC<RowItemProps> = ({ data, columnIndex, rowIndex }) => {
    const form = useForm<{ users: User[] }>();
    const deleteRow = columnIndex === data.columns.length;
    const row = rowIndex;
    const field = data.columns[columnIndex];

    const removeRow = useCallback(() => {
        const original = form.getState().values.users;
        const users = [...original.slice(0, row), ...original.slice(row + 1)];
        form.change("users", users);
    }, [form, row]);
    // console.log({ field, columnIndex, rowIndex, deleteRow: data.columns.length });

    if (deleteRow) {
        return (
            <IconButton style={styles.removeIcon} title={i18n.t("Remove user")} onClick={removeRow}>
                <FontIcon className="material-icons">delete</FontIcon>
            </IconButton>
        );
    }

    if (!field) return null;

    return <RenderUserImportField row={row} field={field} existingUsersNames={data.existingUsersNames} />;
};

const RenderUserImportField: React.FC<{ row: number; field: UserFormField; existingUsersNames: string[] }> = ({
    row,
    field,
    existingUsersNames,
}) => {
    const name = `users[${row}].${field}`;

    const { validation, props: validationProps = {} } = useValidations(field);
    const props = {
        name,
        placeholder: getUserFieldName(field),
        validate: validation,
        ...validationProps,
    };

    switch (field) {
        case "userGroups":
        case "userRoles":
        case "organisationUnits":
        case "dataViewOrganisationUnits":
        case "searchOrganisationsUnits":
            return (
                <PreviewInputFF {...props}>
                    <RenderField row={row} field={field} existingUsersNames={existingUsersNames} />
                </PreviewInputFF>
            );
        default:
            return <RenderField row={row} field={field} existingUsersNames={existingUsersNames} />;
    }
};

const RenderField: React.FC<{ row: number; field: UserFormField; existingUsersNames: string[] }> = ({
    row,
    field,
    existingUsersNames,
}) => {
    // const { values } = useFormState();
    const { validation, props: validationProps = {} } = useValidations(field, existingUsersNames);
    const name = `users[${row}].${field}`;
    const props = {
        name,
        placeholder: getUserFieldName(field),
        validate: validation,
        ...validationProps,
    };

    switch (field) {
        case "firstName":
        case "surname":
        case "username":
            return <FormTextField {...props} />;
        case "password":
            return (
                <FormTextField
                    {...props}
                    type="password"
                    // disabled={values.users[row].externalAuth === true}
                />
            );
        case "userGroups":
            return <FormFieldCustom {...props} component={UserRoleGroupFF} modelType="userGroups" />;
        case "userRoles":
            return <FormFieldCustom {...props} component={UserRoleGroupFF} modelType="userRoles" />;
        case "organisationUnits":
        case "dataViewOrganisationUnits":
        case "searchOrganisationsUnits":
            return <FormFieldCustom {...props} component={OrgUnitSelectorFF} />;
        case "disabled":
            return <FormFieldCustom {...props} component={CheckboxFieldFF} type={"checkbox"} />;
        default:
            return null;
    }
};

const FormFieldCustom = <FieldValue, T extends ComponentType<any>>(props: FormFieldProps<FieldValue, T>) => {
    return <Field<FieldValue> {...props} />;
};

const FormTextField = (props: any) => {
    return (
        <Field {...props}>
            {props => {
                const onChose = (event: any) => {
                    console.log("CHANGE", { props });
                    return props.input.onChange(event);
                };
                return (
                    <div>
                        <TextField
                            name={props.input.name}
                            value={props.input.value}
                            onChange={onChose}
                            error={!!props.meta.error}
                            helperText={props.meta.error ? props.meta.error : ""}
                        />
                    </div>
                );
            }}
        </Field>
    );
};

const useValidations = (
    field: UserFormField,
    existingUsersNames: string[] = []
): { validation?: (...args: any[]) => any; props?: object } => {
    const userRequiredFields = ["username", "firstName", "surname"];

    switch (field) {
        case "username": {
            return {
                // TODO use legacyvalidateUsername
                validation: (value: string) =>
                    !existingUsersNames.includes(value) ? undefined : i18n.t("User already exists"),
            };
        }
        case "password":
            return {
                validation: composeValidators(
                    string,
                    createMinCharacterLength(8),
                    createMaxCharacterLength(255),
                    createPattern(/.*[a-z]/, i18n.t("Password should contain at least one lowercase letter")),
                    createPattern(/.*[A-Z]/, i18n.t("Password should contain at least one UPPERCASE letter")),
                    createPattern(/.*[0-9]/, i18n.t("Password should contain at least one number")),
                    createPattern(/[^A-Za-z0-9]/, i18n.t("Password should have at least one special character"))
                ),
            };
        default: {
            const required = userRequiredFields.includes(field);
            return { validation: required ? hasValue : undefined };
        }
    }
};
