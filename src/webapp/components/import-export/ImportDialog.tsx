import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
// @ts-ignore
import Validators from "d2-ui/lib/forms/Validators";
import { OrderedMap } from "immutable";
import _ from "lodash";
import { FontIcon } from "material-ui";
import { Toggle } from "material-ui/Toggle";

// @ts-ignore
import React, { useEffect, useCallback, SetStateAction, ElementType, useMemo } from "react";
import LoadingMask from "../../../legacy/loading-mask/LoadingMask.component";
import { fieldImportSuffix, getExistingUsers } from "../../../legacy/models/userHelpers";
import { getModelValuesByField, getOrgUnitsRoots } from "../../../legacy/utils/dhis2Helpers";
import { Fields } from "./FormBuilder";
import { toBuilderValidator, validatePassword, validateUsername } from "../../../legacy/utils/validators";

import InfoDialog from "../../../legacy/components/InfoDialog";
import ModalLoadingMask from "../../../legacy/components/ModalLoadingMask.component";
import { generateUid } from "../../../utils/uid";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";
import { Id } from "../../../domain/entities/Ref";
import UserLegacy from "../../../legacy/models/user";
import { OrgUnit } from "../../../domain/entities/OrgUnit";
import { User } from "../../../domain/entities/User";
import { ApiUser } from "../../../data/repositories/UserD2ApiRepository";
import { ImportTable } from "./ImportTable";

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
};

export const ImportDialog: React.FC<ImportTableProps> = props => {
    const {
        title,
        usersFromFile,
        columns,
        maxUsers,
        onSave,
        onRequestClose,
        templateUser = null,
        settings,
        api,
        actionText,
        warnings = [],
    } = props;

    const { d2 } = useAppContext();

    const [existingUsers, setExistingUsers] = React.useState<Record<string, User>>({});
    const [infoDialog, setInfoDialog] = React.useState<{ title: string; body: string; response: string } | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isImporting, setIsImporting] = React.useState(false);
    const [users, setUsers] = React.useState(OrderedMap<Id, Pick<User, keyof Fields>>([]));
    const [areUsersValid, setAreUsersValid] = React.useState<boolean | null>(null);
    const [allowOverwrite, setAllowOverwrite] = React.useState(false);
    const [orgUnitRoots, setOrgUnitRoots] = React.useState<OrgUnit[] | null>(null);
    const [validateOnRender, setValidateOnRender] = React.useState(false);
    const [modelValuesByField, setModelValuesByField] = React.useState<Record<string, string[]>>({});

    const [showOverwriteToggle, setShowOverwriteToggle] = React.useState(false);
    const [usersValidation, setUsersValidation] = React.useState({});

    const getUsername = (user: ApiUser | User): string => {
        if ("userCredentials" in user) {
            return user.userCredentials.username;
        } else {
            return user.username;
        }
    };

    useEffect(
        () => {
            const fetchData = async () => {
                setIsLoading(true);
                const [modelValuesByFieldD2, orgUnitRootsD2, existingUsersD2]: [
                    Record<string, any>,
                    OrgUnit[],
                    UserLegacy[]
                ] = await Promise.all([getModelValuesByField(d2, columns), getOrgUnitsRoots(), getExistingUsers(d2)]);
                setModelValuesByField(modelValuesByFieldD2);
                setOrgUnitRoots(orgUnitRootsD2);
                const existingUsersMapped = _.keyBy(existingUsersD2, getUsername) as Record<string, UserLegacy>;
                setExistingUsers(existingUsersMapped as unknown as SetStateAction<Record<string, User>>);
                const existingUsernamesSet = new Set(
                    existingUsersD2.map((_user: Partial<UserLegacy>) => getUsername(_user as ApiUser))
                );
                const usersById = _(usersFromFile)
                    // .sortBy(user => _(existingUsersMapped).keys().includes(getUsername(user)))
                    .sortBy(user => !existingUsernamesSet.has(getUsername(user)))
                    .map(user => ({ ...user, id: generateUid() }))
                    .map(user => [user.id, user])
                    .value();
                // @ts-ignore
                setUsers(new OrderedMap(usersById));
                // setShowOverwriteToggle(
                //     users
                //         .valueSeq()
                //         // @ts-ignore
                //         .some((user: { username: any }) => _.has(existingUsersMapped, user.username))
                // );
                console.log("fetchData", { users: users.valueSeq().toJS(), usersFromFile });
                setIsLoading(false);
            };

            fetchData();
        },
        [
            // columns,
            // usersFromFile,
            // d2,
        ]
    );

    // FormBuilder usually validates only the current field, which is faster, but sometimes we
    // need to validate the form builder (i.e. checking uniqueness of fields). Call this method
    // whenever you want to fully validate the form.
    const validateOnNextRender = useCallback(
        (toValidate = true) => {
            setValidateOnRender(toValidate);
        },
        [
            // setValidateOnRender
        ]
    );

    const closeInfoDialog = () => {
        setInfoDialog(null);
    };

    const onSaveTable = async () => {
        setIsImporting(true);
        try {
            // @ts-ignore
            const errorResponse = await onSave(users.valueSeq().toJS());
            if (errorResponse) {
                setIsImporting(false);
                // @ts-ignore
                setInfoDialog({ response: errorResponse });
            } else {
                onRequestClose();
            }
        } catch (err) {
            console.error(err);
            setIsImporting(false);
        }
    };

    const toggleAllowOverwrite = () => {
        setAllowOverwrite(!allowOverwrite);
        validateOnNextRender();
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

    const updateUsers = useCallback(
        users => {
            console.log("updateUsers", { users: users.valueSeq().toJS() });
            setUsers(users);
        },
        [setUsers]
    );

    const forceRender = (date: Date) => {
        console.log("forceRender", { date });
    };
    // const showOverwriteToggle = useCallback(() => {
    //     return users
    //         .valueSeq()
    //         // @ts-ignore
    //         .some((user: { username: any }) => _.includes(existingUsernames, user.username));
    // }, [users, existingUsernames]);

    return (
        <ConfirmationDialog
            open={true}
            title={renderDialogTitle()}
            maxWidth={"lg"}
            fullWidth={true}
            cancelText={i18n.t("Close")}
            onCancel={onRequestClose}
            saveText={actionText}
            onSave={() => onSaveTable()}
            disableSave={users.isEmpty() || !areUsersValid}
        >
            {isImporting && <ModalLoadingMask />}
            {JSON.stringify(
                users.map(({ username, firstName, surname }) => ({ username, firstName, surname })),
                null,
                2
            )}
            {isLoading ? (
                <LoadingMask />
            ) : (
                <ImportTable
                    api={api}
                    usersFromFile={usersFromFile}
                    columns={columns}
                    warnings={warnings}
                    maxUsers={maxUsers}
                    settings={settings}
                    modelValuesByField={modelValuesByField}
                    validateOnRender={validateOnRender}
                    users={users}
                    existingUsers={existingUsers}
                    orgUnitRoots={orgUnitRoots}
                    updateUsers={updateUsers}
                    allowOverwrite={allowOverwrite}
                    // forceRender={forceRender}
                    existingUsernames={new Set(_.keys(existingUsers))}
                />
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
    columns: (keyof FieldsInfo)[];
    maxUsers: number;
    onSave: (users: UserLegacy[]) => Promise<any>;
    onRequestClose: () => void;
    templateUser?: UserLegacy;
    settings: any;
    api: any;
    actionText: string;
    warnings: string[];
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
