import _ from "lodash";
import { FontIcon, RaisedButton } from "material-ui";

import React, { useState, useEffect, useCallback, SetStateAction, ComponentType } from "react";

import InfoDialog from "../../../legacy/components/InfoDialog";
import { generateUid } from "../../../utils/uid";
import i18n from "../../../locales";
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from "@material-ui/core";
import { IconButton, Chip } from "material-ui";
import { Form, FormSpy, useForm, Field } from "react-final-form";
import { FormState } from "final-form";
import { defaultUser, User } from "../../../domain/entities/User";
import { ColumnSelectorDialog } from "../column-selector-dialog/ColumnSelectorDialog";
import { UserFormField, getUserFieldName, userFormFields } from "../user-form/utils";
import { UserRoleGroupFF } from "../user-form/components/UserRoleGroupFF";
import { OrgUnitSelectorFF } from "../user-form/components/OrgUnitSelectorFF";
import { PreviewInputFF } from "../form/fields/PreviewInputFF";
import styled from "styled-components";
import { FormFieldProps } from "../form/fields/FormField";
import { useGetAllUsers } from "../../hooks/userHooks";
import { Maybe } from "../../../types/utils";
import { useAppContext } from "../../contexts/app-context";
import { ImportUser } from "../../../domain/entities/ImportUser";
import { UserLogic } from "../../../domain/entities/UserLogic";

const columnNameFromPropertyMapping: Record<Columns, string> = {
    id: "ID",
    username: "Username",
    password: "Password",
    firstName: "First name",
    surname: "Surname",
    email: "Email",
    phoneNumber: "Phone number",
    openId: "Open ID",
    userRoles: "Roles",
    userGroups: "Groups",
    organisationUnits: "OUCapture",
    dataViewOrganisationUnits: "OUOutput",
    searchOrganisationsUnits: "OUSearch",
    disabled: "Disabled",
};

export type Columns =
    | "id"
    | "username"
    | "password"
    | "firstName"
    | "surname"
    | "email"
    | "phoneNumber"
    | "openId"
    | "userRoles"
    | "userGroups"
    | "organisationUnits"
    | "dataViewOrganisationUnits"
    | "searchOrganisationsUnits"
    | "disabled";

type ImportTableProps = {
    title: string;
    usersFromFile: User[];
    columns: Columns[];
    onSave: (users: User[]) => void;
    onRequestClose: () => void;
    templateUser?: UserLegacy;
    actionText: string;
    warnings: string[];
};

export const ImportTable: React.FC<ImportTableProps> = props => {
    const {
        title,
        usersFromFile,
        columns: baseUserColumns,
        onSave,
        onRequestClose,
        templateUser = null,
        actionText,
        warnings = [],
    } = props;
    const [users, setUsers] = useState<User[]>(usersFromFile);
    const [existingUsers, setExistingUsers] = React.useState<Record<string, User>>({});
    const [existingUsersNames, setExistingUsersNames] = React.useState<string[]>([]);

    const [infoDialog, setInfoDialog] = React.useState<{ response: string }>();
    const [isLoading, setIsLoading] = React.useState(true);

    const [allowOverwrite, setAllowOverwrite] = React.useState(false);
    const [showOverwriteToggle, setShowOverwriteToggle] = React.useState(true);

    // Add a blank column to the end for delete buttons
    const [columns, setColumns] = useState<(Columns | "")[]>([...baseUserColumns, ""]);
    const [columnSelectorOpen, setColumnSelectorOpen] = useState<boolean>(false);

    const [errorsCount, setErrorsCount] = React.useState(0);
    const [areUsersValid, setAreUsersValid] = React.useState(false);
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();

    const loading = useLoading();

    const { users: allUsers } = useGetAllUsers();
    useEffect(() => {
        const getUsername = (user: User | ApiUser): string => {
            if ("userCredentials" in user) {
                return user.userCredentials.username;
            } else {
                return user.username;
            }
        };
        loading.show(true);

        const fetchData = () => {
            setIsLoading(true);
            if (!allUsers) {
                return;
            }
            const existingUsersMapped = _.keyBy(allUsers, getUsername) as Record<string, User>;
            setExistingUsers(existingUsersMapped as unknown as SetStateAction<Record<string, User>>);
            setExistingUsersNames(allUsers.map((user: User) => getUsername(user)));
            setIsLoading(false);
            loading.reset();
        };

        fetchData();
    }, [allUsers, loading]);

    const existingUserInTable = useCallback(
        (newUsers: User[]) => {
            if (!existingUsersNames) {
                return false;
            }
            return _(newUsers).some(user => existingUsersNames.includes(user.username));
        },
        [existingUsersNames]
    );

    const closeInfoDialog = () => {
        setInfoDialog(undefined);
    };

    const toggleAllowOverwrite = useCallback(
        (_event, newValue: boolean, form) => {
            requestAnimationFrame(() => {
                form.change("updateValidation", newValue);
            });
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

        const warningText =
            warnings.length === 0
                ? null
                : _([
                      i18n.t("{{n}} warning(s) while importing file", { n: warnings.length }) + ":",
                      ..._(warnings)
                          .take(maxWarnings)
                          .map((line, idx) => `${idx + 1}. ${line}`)
                          .value(),
                      hiddenWarnings > 0 ? i18n.t("and_n_more_warnings", { n: hiddenWarnings }) : null,
                  ])
                      .compact()
                      .join("\n");

        return (
            <React.Fragment>
                {title}
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
        ({ users }: { users: User[] }) => {
            loading.show(true, i18n.t("Importing users"));
            return compositionRoot.users.import({ users }).run(
                () => {
                    onRequestClose();
                    loading.hide();
                    onSave([]);
                    snackbar.success(i18n.t("Users imported successfully"));
                },
                error => {
                    loading.hide();
                    snackbar.error(error);
                }
            );
        },
        [loading, onRequestClose, onSave, snackbar, compositionRoot.users]
    );

    const addRow = useCallback(() => {
        const newUser = {
            ...defaultUser,
            id: generateUid(),
            username: "",
            password: UserLogic.DEFAULT_PASSWORD,
        };

        setUsers(users => users.concat(newUser));
    }, []);

    const renderTableRow = useCallback(
        (user: User, rowIndex: number, users: User[]) => {
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

                    {columns.map((value: string, columnIndex: number) => (
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
                    ))}
                </StyledTableRow>
            );
        },
        [columns, existingUsers, existingUsersNames, allowOverwrite]
    );

    const updateFormState = ({ values: { users: updatedUsers }, errors }: FormState<{ users: User[] }>) => {
        setErrorsCount(errors?.users?.length || 0);
        setAreUsersValid(_.isEmpty(errors?.users));
        setShowOverwriteToggle(existingUserInTable(updatedUsers));
    };

    return (
        <Dialog open maxWidth="lg" fullWidth>
            <StyledDialogTitle>{renderDialogTitle()}</StyledDialogTitle>
            <DialogContent>
                {!isLoading && (
                    <div>
                        {columnSelectorOpen && (
                            <ColumnSelectorDialog
                                columns={userFormFields}
                                visibleColumns={columns}
                                onChange={columns => setColumns(columns as Columns[])}
                                getName={getUserFieldName}
                                onCancel={() => setColumnSelectorOpen(false)}
                            />
                        )}
                        <TableContainer>
                            <Form<{ users: User[] }>
                                autocomplete="off"
                                onSubmit={onSubmit}
                                initialValues={{ users }}
                                render={({ handleSubmit, form, values }) => {
                                    const canAddNewUser = values.users.length < ImportUser.MAX_USERS;
                                    return (
                                        <>
                                            <FormSpy
                                                onChange={(state: FormState<{ users: User[] }>) => {
                                                    requestAnimationFrame(() => {
                                                        updateFormState(state);
                                                    });
                                                }}
                                            />

                                            <form id="import-form" onSubmit={handleSubmit}>
                                                <Table stickyHeader={true}>
                                                    <TableHead>
                                                        <TableRow>
                                                            <StyledTableColumn>#</StyledTableColumn>
                                                            {columns.map((header: string) => (
                                                                <StyledTableCellHeader key={header}>
                                                                    {columnNameFromPropertyMapping[header as Columns] ||
                                                                        header}
                                                                </StyledTableCellHeader>
                                                            ))}
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {_.map(users, (user: User, rowIndex: string) =>
                                                            renderTableRow(user, Number(rowIndex), values.users)
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
                                            {showOverwriteToggle && !templateUser && (
                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={allowOverwrite}
                                                            onChange={(event, newValue) =>
                                                                toggleAllowOverwrite(event, newValue, form)
                                                            }
                                                        />
                                                    }
                                                    label={i18n.t("Overwrite existing users")}
                                                />
                                            )}
                                        </>
                                    );
                                }}
                            />
                        </TableContainer>
                    </div>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onRequestClose}>{i18n.t("Cancel")}</Button>
                <Button disabled={_.isEmpty(users) || !areUsersValid} type="submit" form="import-form" color="primary">
                    {actionText}
                </Button>
            </DialogActions>
            {infoDialog && (
                <InfoDialog
                    t={i18n.t}
                    title={i18n.t("Error on metadata action")}
                    onClose={() => closeInfoDialog()}
                    response={infoDialog.response}
                />
            )}
        </Dialog>
    );
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
    const username = form.getState().values.users[rowIndex]?.username;
    const isExistingUser = username ? data.existingUsersNames.includes(username) : false;

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
            allowOverwrite={allowOverwrite}
            isExistingUser={isExistingUser}
        />
    );
};

const RenderUserImportField: React.FC<{
    rowIndex: number;
    field: UserFormField;
    allowOverwrite: boolean;
    isExistingUser: boolean;
}> = ({ rowIndex, field, allowOverwrite, isExistingUser }) => {
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
                        allowOverwrite={allowOverwrite}
                        isExistingUser={isExistingUser}
                    />
                </PreviewInputFF>
            );
        default:
            return (
                <RenderField
                    rowIndex={rowIndex}
                    field={field}
                    allowOverwrite={allowOverwrite}
                    isExistingUser={isExistingUser}
                />
            );
    }
};

const RenderField: React.FC<{
    rowIndex: number;
    field: UserFormField;
    allowOverwrite: boolean;
    isExistingUser: boolean;
}> = ({ rowIndex, field, allowOverwrite, isExistingUser }) => {
    const { validation, props: validationProps = {} } = useValidations(field, allowOverwrite, isExistingUser);
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
        case "openId":
        case "username":
            return <FormTextField {...props} />;
        case "password":
            return <FormTextField {...props} type="password" />;
        case "email":
            return <FormTextField {...props} type="email" />;
        case "phoneNumber":
            return <FormTextField {...props} type="tel" />;
        case "userGroups":
            return <FormFieldDialog {...props} component={UserRoleGroupFF} modelType="userGroups" />;
        case "userRoles":
            return <FormFieldDialog {...props} component={UserRoleGroupFF} modelType="userRoles" />;
        case "organisationUnits":
        case "dataViewOrganisationUnits":
        case "searchOrganisationsUnits":
            return <FormFieldDialog {...props} component={OrgUnitSelectorFF} />;
        case "disabled":
            return (
                <Field {...props} type="checkbox">
                    {fieldProps => {
                        return (
                            <Switch
                                checked={fieldProps.input.checked}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                    return fieldProps.input.onChange(event);
                                }}
                            />
                        );
                    }}
                </Field>
            );
        default:
            return <FormTextField {...props} />;
    }
};

const FormFieldDialog = <FieldValue, T extends ComponentType<any>>(props: FormFieldProps<FieldValue, T>) => {
    return <Field<FieldValue> {...props} />;
};

const FormTextField = (props: FormTextFieldProps) => {
    return (
        <Field {...props}>
            {fieldProps => {
                const validationErrorMessage = props.validate ? props.validate(fieldProps.input.value) : "";
                const thereIsAnError = Boolean(validationErrorMessage);
                const onChose = (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
                    return fieldProps.input.onChange(event);
                };
                return (
                    <div>
                        <TextField
                            name={fieldProps.input.name}
                            value={fieldProps.input.value}
                            onChange={onChose}
                            error={thereIsAnError}
                            helperText={validationErrorMessage}
                        />
                    </div>
                );
            }}
        </Field>
    );
};

const userRequiredFields = [
    "username",
    "firstName",
    "surname",
    "password",
    "userRoles",
    "userGroups",
    "organisationUnits",
];

const useValidations = (
    field: UserFormField,
    allowOverwrite = false,
    isExistingUser = false
): { validation?: (...args: any[]) => Maybe<string>; props?: object } => {
    switch (field) {
        case "username": {
            return {
                validation: (value: string) => {
                    if (!value) return i18n.t("Please provide a username");
                    if (allowOverwrite && isExistingUser) return "";
                    if (isExistingUser) {
                        return i18n.t("User already exists");
                    } else {
                        const validators = composeValidators(
                            string,
                            createMinCharacterLength(2),
                            createMaxCharacterLength(140)
                        );
                        return validators(value);
                    }
                },
            };
        }
        case "email":
            return {
                validation: createPattern(
                    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
                    i18n.t("Please provide a valid email")
                ),
            };
        case "password":
            return {
                validation: (value: string) => {
                    if (isExistingUser && !value) return "";
                    if (!value) {
                        return i18n.t("Please provide a password");
                    } else {
                        const validators = composeValidators(
                            string,
                            createMinCharacterLength(8),
                            createMaxCharacterLength(255),
                            createPattern(/.*[a-z]/, i18n.t("Password should contain at least one lowercase letter")),
                            createPattern(/.*[A-Z]/, i18n.t("Password should contain at least one UPPERCASE letter")),
                            createPattern(/.*[0-9]/, i18n.t("Password should contain at least one number")),
                            createPattern(/[^A-Za-z0-9]/, i18n.t("Password should have at least one special character"))
                        );
                        return validators(value);
                    }
                },
            };
        case "phoneNumber":
            return {
                validation: createPattern(/^\+?[0-9 \-()]+$/, i18n.t("Please provide a valid phone number")),
            };
        case "userRoles":
        case "userGroups":
        case "organisationUnits":
            // NOTE: userGroups is not a mandatory field but its required by src/domain/usecases/ImportUsersUseCase.ts
            return {
                validation: (value: string[]) => {
                    const errorMessage = "Please select at least one item";
                    if (!value) return i18n.t(errorMessage);
                    return value.length > 0 ? undefined : i18n.t(errorMessage);
                },
            };
        default: {
            const required = userRequiredFields.includes(field);
            return { validation: required ? hasValue : undefined };
        }
    }
};

type FormTextFieldProps = {
    name: string;
    placeholder: string;
    type?: string;
    validate?: (value: Maybe<string>) => Maybe<string>;
};

const StyledTableCellHeader = styled(TableCell)`
    width: 150px;
    font-weight: bold;
    font-size: 1.2em;
    overflow: hidden;
    white-space: nowrap;
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
