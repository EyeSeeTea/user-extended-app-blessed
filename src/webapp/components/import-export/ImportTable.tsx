import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import _ from "lodash";
import { FontIcon, RaisedButton } from "material-ui";

import React, { useState, useEffect, useCallback, SetStateAction, ComponentProps, ComponentType } from "react";
import { getExistingUsers } from "../../../legacy/models/userHelpers";
import { Fields } from "./FormBuilder";
// import { validateUsername } from "../../../legacy/utils/validators";

import InfoDialog from "../../../legacy/components/InfoDialog";
import { generateUid } from "../../../utils/uid";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";
import UserLegacy from "../../../legacy/models/user";
import { ApiUser } from "../../../data/repositories/UserD2ApiRepository";
import {
    composeValidators,
    createMaxCharacterLength,
    createMinCharacterLength,
    createPattern,
    hasValue,
    string,
} from "@dhis2/ui";
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
    Switch,
    FormControlLabel,
    DialogTitle,
    Typography,
} from "@material-ui/core";
// import { Delete, ViewColumn } from "@material-ui/icons";
import { IconButton, Chip } from "material-ui";
import { Form, FormSpy, useForm, Field, UseFieldConfig } from "react-final-form";
import { FormState } from "final-form";
import { defaultUser, User } from "../../../domain/entities/User";
import { ColumnSelectorDialog } from "../column-selector-dialog/ColumnSelectorDialog";
import { UserFormField, getUserFieldName, userFormFields } from "../user-form/utils";
import { UserRoleGroupFF } from "../user-form/components/UserRoleGroupFF";
import { OrgUnitSelectorFF } from "../user-form/components/OrgUnitSelectorFF";
import { PreviewInputFF } from "../form/fields/PreviewInputFF";
import styled from "styled-components";

type FormFieldProps<FieldValue, T extends ComponentType<any>> = UseFieldConfig<FieldValue> &
    Omit<ComponentProps<T>, "input" | "meta"> & {
        name: string;
        component: T;
        value?: FieldValue;
        initialValue?: FieldValue;
        defaultValue?: FieldValue;
    };

export const ImportTable: React.FC<ImportTableProps> = props => {
    const {
        title,
        usersFromFile,
        columns: baseUserColumns,
        maxUsers,
        onSave,
        onRequestClose,
        templateUser = null,
        actionText,
        warnings = [],
    } = props;

    const { compositionRoot, d2 } = useAppContext();

    const [users, setUsers] = useState<User[]>(usersFromFile);
    const [existingUsers, setExistingUsers] = React.useState<Record<string, User>>({});
    const [existingUsersNames, setExistingUsersNames] = React.useState<string[]>([]);

    const [infoDialog, setInfoDialog] = React.useState<{ title: string; body: string; response: string } | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    const [allowOverwrite, setAllowOverwrite] = React.useState(false);
    const [showOverwriteToggle, setShowOverwriteToggle] = React.useState(true);

    // Add a blank column to the end for delete buttons
    const [columns, setColumns] = useState<string[]>([...baseUserColumns, ""]);
    const [columnSelectorOpen, setColumnSelectorOpen] = useState<boolean>(false);

    const [errorsCount, setErrorsCount] = React.useState(0);
    const [areUsersValid, setAreUsersValid] = React.useState(false);
    const [forceValidateFields, setForceValidateFields] = React.useState(false);

    const loading = useLoading();
    const snackbar = useSnackbar();

    useEffect(() => {
        const getUsername = (user: ApiUser | User): string => {
            if ("userCredentials" in user) {
                return user.userCredentials.username;
            } else {
                return user.username;
            }
        };

        const fetchData = async () => {
            setIsLoading(true);
            loading.show(true);
            const [existingUsersD2]: [UserLegacy[]] = await Promise.all([getExistingUsers(d2)]);
            const existingUsersMapped = _.keyBy(existingUsersD2, getUsername) as Record<string, UserLegacy>;
            setExistingUsers(existingUsersMapped as unknown as SetStateAction<Record<string, User>>);
            setExistingUsersNames(existingUsersD2.map((_user: Partial<UserLegacy>) => getUsername(_user as ApiUser)));
            setIsLoading(false);
            loading.reset();
        };

        fetchData();
    }, [d2]);

    const existingUserInTable = useCallback(
        (newUsers: User[]) => {
            if (!existingUsersNames) {
                return false;
            }
            return newUsers.some(user => existingUsersNames.includes(user.username));
        },
        [existingUsersNames]
    );

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

    const toggleAllowOverwrite = useCallback(
        (_event, newValue: boolean) => {
            setAreUsersValid(newValue || !errorsCount);
            setAllowOverwrite(newValue);
        },
        [errorsCount]
    );

    const renderDialogTitle = () => {
        const errorText =
            errorsCount === 0
                ? null
                : i18n.t("{{n}} invalid users found, check in-line errors in table", { n: errorsCount });
        const maxWarnings = 10;
        const hiddenWarnings = Math.max(warnings.length - maxWarnings, 0);

        const warningText = undefined;
        // warnings.length === 0
        //     ? null
        //     : _([
        //           i18n.t("{{n}} warning(s) while importing file", { n: warnings.length }) + ":",
        //           // @ts-ignore
        //           ..._(warnings)
        //               .take(maxWarnings)
        //               .map((line, idx) => `${idx + 1}. ${line}`),
        //           hiddenWarnings > 0 ? i18n.t("and_n_more_warnings", { n: hiddenWarnings }) : null,
        //       ])
        //           .compact()
        //           .join("\n");

        return (
            <React.Fragment>
                <StyledDialogTitle>{title}</StyledDialogTitle>
                {errorText && (
                    <DialogTooltip title={errorText}>
                        <FontIcon className="material-icons">error</FontIcon>
                    </DialogTooltip>
                )}
                {warningText && (
                    <DialogTooltip title={warningText}>
                        <FontIcon className="material-icons">warning</FontIcon>
                    </DialogTooltip>
                )}
            </React.Fragment>
        );
    };

    const onSubmit = useCallback(
        async ({ users }: { users: User[] }) => {
            loading.show(true, i18n.t("Saving users"));

            // const { data, error } = await compositionRoot.users.save(users).runAsync();
            const { data, error } = await Promise.resolve({ data: { status: "OK" }, error: null });

            loading.reset();

            if (error) {
                snackbar.error(error);
                return error;
            }

            if (data && data.status === "ERROR") {
                // error
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

    let submit: any;

    const renderTableRow = useCallback(
        (user: User, rowIndex: number, users: User[]) => {
            // TODO maybe useFormState();
            const currentUsername = users[rowIndex]?.username || user.username;
            const existingUser = existingUsers[currentUsername];
            const chipTitle = existingUser
                ? i18n.t("User already exists: {{id}}", { id: existingUser.id, nsSeparator: false })
                : "";
            const chipText = (rowIndex + 1).toString() + (existingUser ? "-E" : "");
            return (
                <StyledTableRow key={rowIndex} $isError={!allowOverwrite && !!existingUser}>
                    <StyledTableCell>
                        <Tooltip title={chipTitle}>
                            <StyledChipExistingUser $isError={!!existingUser}>{chipText}</StyledChipExistingUser>
                        </Tooltip>
                    </StyledTableCell>

                    {_(columns)
                        .map((value: string, columnIndex: number) => (
                            <StyledTableCell key={`${rowIndex}-${columnIndex}-${value}`}>
                                <RowItem
                                    key={`${rowIndex}-${columnIndex}-${value}`}
                                    rowIndex={rowIndex}
                                    columnIndex={columnIndex}
                                    data={{ columns, existingUsersNames }}
                                    onDelete={users => setUsers(users)}
                                    allowOverwrite={allowOverwrite}
                                />
                            </StyledTableCell>
                        ))
                        .value()}
                </StyledTableRow>
            );
        },
        [columns, existingUsersNames, allowOverwrite]
    );

    const updateFormState = ({ values: { users: updatedUsers }, errors }: FormState<{ users: User[] }>) => {
        setErrorsCount(errors?.users?.length || 0);
        setAreUsersValid(_.isEmpty(errors?.users));
        setShowOverwriteToggle(existingUserInTable(updatedUsers));
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
            disableSave={_.isEmpty(users) || !areUsersValid}
        >
            {!isLoading && (
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
                                const canAddNewUser = values.users.length < maxUsers;

                                submit = handleSubmit;
                                return (
                                    <>
                                        <FormSpy onChange={updateFormState} />

                                        <form onSubmit={submit}>
                                            <Table stickyHeader={true}>
                                                <TableHead>
                                                    <TableRow>
                                                        <StyledTableColumn>#</StyledTableColumn>
                                                        {columns.map((header: string) => (
                                                            <StyledTableCellHeader key={header}>
                                                                {header}
                                                            </StyledTableCellHeader>
                                                        ))}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {_.map(users, (user: User, rowIndex: number) =>
                                                        renderTableRow(user, rowIndex, values.users)
                                                    )}
                                                </TableBody>
                                            </Table>

                                            <AddButtonRow>
                                                <RaisedButton
                                                    disabled={!canAddNewUser}
                                                    label={i18n.t("Add user")}
                                                    onClick={addRow}
                                                />
                                            </AddButtonRow>
                                        </form>
                                    </>
                                );
                            }}
                        />
                    </TableContainer>
                    {showOverwriteToggle && !templateUser && (
                        <FormControlLabel
                            control={<Switch checked={allowOverwrite} onChange={toggleAllowOverwrite} />}
                            label={i18n.t("Overwrite existing users")}
                        />
                    )}
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
    onDelete: (users: User[]) => void;
    allowOverwrite: boolean;
};

const RowItem: React.FC<RowItemProps> = ({ data, columnIndex, rowIndex, onDelete, allowOverwrite }) => {
    const form = useForm<{ users: User[] }>();
    const deleteRow = columnIndex === data.columns.length - 1;
    const field = data.columns[columnIndex];

    const removeRow = useCallback(() => {
        const original = form.getState().values.users;
        const users = [...original.slice(0, rowIndex), ...original.slice(rowIndex + 1)];
        onDelete(users);
    }, [form, onDelete, rowIndex]);

    if (deleteRow) {
        return (
            <StyledIconButton title={i18n.t("Remove user")} onClick={removeRow}>
                <FontIcon className="material-icons">delete</FontIcon>
            </StyledIconButton>
        );
    }

    if (!field) return null;

    return (
        <RenderUserImportField
            rowIndex={rowIndex}
            field={field}
            existingUsersNames={data.existingUsersNames}
            allowOverwrite={allowOverwrite}
        />
    );
};

const RenderUserImportField: React.FC<{
    rowIndex: number;
    field: UserFormField;
    existingUsersNames: string[];
    allowOverwrite: boolean;
}> = ({ rowIndex, field, existingUsersNames, allowOverwrite }) => {
    const name = `users[${rowIndex}].${field}`;

    const { validation, props: validationProps = {} } = useValidations(field);
    const props = {
        name,
        placeholder: getUserFieldName(field),
        validate: validation,
        component: TextField,
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
                    <RenderField
                        rowIndex={rowIndex}
                        field={field}
                        existingUsersNames={existingUsersNames}
                        allowOverwrite={allowOverwrite}
                    />
                </PreviewInputFF>
            );
        default:
            return (
                <RenderField
                    rowIndex={rowIndex}
                    field={field}
                    existingUsersNames={existingUsersNames}
                    allowOverwrite={allowOverwrite}
                />
            );
    }
};

const RenderField: React.FC<{
    rowIndex: number;
    field: UserFormField;
    existingUsersNames: string[];
    allowOverwrite: boolean;
}> = ({ rowIndex, field, existingUsersNames, allowOverwrite }) => {
    // const { values } = useFormState();
    const { validation, props: validationProps = {} } = useValidations(field, existingUsersNames, allowOverwrite);
    const name = `users[${rowIndex}].${field}`;
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
            return <FormTextField {...props} type="password" />;
        case "userGroups":
            return <FormFieldCustom {...props} component={UserRoleGroupFF} modelType="userGroups" />;
        case "userRoles":
            return <FormFieldCustom {...props} component={UserRoleGroupFF} modelType="userRoles" />;
        case "organisationUnits":
        case "dataViewOrganisationUnits":
        case "searchOrganisationsUnits":
            return <FormFieldCustom {...props} component={OrgUnitSelectorFF} />;
        case "disabled":
            return <FormFieldCustom {...props} component={Switch} type={"checkbox"} />;
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
    existingUsersNames: string[] = [],
    allowOverwrite = false
): { validation?: (...args: any[]) => any; props?: object } => {
    const userRequiredFields = ["username", "firstName", "surname"];

    switch (field) {
        case "username": {
            return {
                // TODO use legacyvalidateUsername
                validation: (value: string) => {
                    const a = !existingUsersNames.includes(value) ? undefined : i18n.t("User already exists");
                    if (allowOverwrite) return undefined;
                    return a;
                },
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

const StyledTableCellHeader = styled(TableCell)`
    width: 150px;
    font-weight: bold;
    font-size: 1.2em;
    overflow: hidden;
`;

const StyledTableCell = styled(TableCell)`
    width: 150px;
`;

const StyledTableRow = styled(TableRow)<{ $isError?: boolean }>`
    border: none;
    background-color: ${({ $isError }) => ($isError ? "#fdd" : "initial")};
`;

const StyledChipExistingUser = styled(Chip)<{ $isError?: boolean }>`
    background-color: ${({ $isError }) => ($isError ? "#faa" : "#e0e0e0e0")} !important;
`;

const StyledIconButton = styled(IconButton)`
    cursor: pointer;
`;

const StyledTableColumn = styled(TableCell)`
    width: 70px;
`;

const StyledDialogTitle = styled(DialogTitle)`
    margin: 0px 0px -1px;
    padding: 24px 24px 20px;
    font-size: 24px;
    font-weight: bold;
    line-height: 32px;
    display: inline;
`;

const DialogTooltip = styled(Tooltip)`
    float: right;
`;

const AddButtonRow = styled.div`
    margin: 20px;
    text-align: center;
`;
