import {
    ObjectsList,
    ObjectsTableProps,
    Pager,
    TableColumn,
    TableConfig,
    TablePagination,
    TableSorting,
    useObjectsTable,
    useSnackbar,
} from "@eyeseetea/d2-ui-components";
import { Icon, Tooltip } from "@material-ui/core";
import { Check, Tune } from "@material-ui/icons";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import _ from "lodash";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Id, NamedRef } from "../../../domain/entities/Ref";
import { hasReplicateAuthority, User } from "../../../domain/entities/User";
import { ListFilters, UpdateStrategy } from "../../../domain/repositories/UserRepository";
import { SaveUserOrgUnitOptions } from "../../../domain/usecases/SaveUserOrgUnitUseCase";
import i18n from "../../../locales";
import { Maybe } from "../../../types/utils";
import { useAppContext } from "../../contexts/app-context";
import { useReload } from "../../hooks/useReload";
import { useGetUsersByIds, useSaveUsersOrgUnits } from "../../hooks/userHooks";
import { MultiSelectorDialog, MultiSelectorDialogProps } from "../multi-selector-dialog/MultiSelectorDialog";
import { OrgUnitDialogSelector } from "../orgunit-dialog-selector/OrgUnitDialogSelector";
import {
    ActionType,
    generateMessage,
    getFirstThreeUserNames,
    UsersSelectedModal,
} from "../users-remove-modal/UsersSelectedModal";

function convertActionToOrgUnitType(action: ActionType): SaveUserOrgUnitOptions["orgUnitType"] {
    switch (action) {
        case "assign_to_org_units_capture":
            return "capture";
        case "assign_to_org_units_output":
            return "output";
        case "assign_to_org_units_search":
            return "search";
        case "disable":
        case "enable":
        case "remove":
            throw new Error(`Invalid action: ${action}`);
    }
}

function isActionTypeOrgUnit(actionType: Maybe<ActionType>): boolean {
    return (
        actionType === "assign_to_org_units_capture" ||
        actionType === "assign_to_org_units_output" ||
        actionType === "assign_to_org_units_search"
    );
}

function isActionTypeEnableOrRemove(actionType: Maybe<ActionType>): boolean {
    return actionType === "disable" || actionType === "enable" || actionType === "remove";
}

function buildOrgUnitTitleByAction(
    actionType: ActionType,
    ouCapture: string,
    ouOutput: string,
    ouSearch: string
): string {
    switch (actionType) {
        case "assign_to_org_units_capture":
            return ouCapture;
        case "assign_to_org_units_output":
            return ouOutput;
        case "assign_to_org_units_search":
            return ouSearch;
        default:
            return "";
    }
}

export const UserListTable: React.FC<UserListTableProps> = ({
    openSettings,
    onChangeVisibleColumns,
    onChangeSearch,
    filters,
    canManage,
    rootJunction,
    children,
    reloadTableKey,
    onAction,
}) => {
    const { compositionRoot, currentUser } = useAppContext();
    const [reloadKey, reload] = useReload();

    const [multiSelectorDialogProps, openMultiSelectorDialog] = useState<MultiSelectorDialogProps>();
    const [visibleColumns, setVisibleColumns] = useState<Array<keyof User>>();
    const [selectedUserIds, setSelectedUserIds] = useState<Id[]>([]);
    const [actionType, setActionType] = useState<ActionType>();

    const enableReplicate = hasReplicateAuthority(currentUser);
    const snackbar = useSnackbar();
    const navigate = useNavigate();

    const { users, setUsers } = useGetUsersByIds(selectedUserIds);

    const onCleanSelectedUsers = React.useCallback(() => {
        setSelectedUserIds([]);
        setUsers(undefined);
        setActionType(undefined);
    }, [setUsers]);

    const { saveUsersOrgUnits } = useSaveUsersOrgUnits({
        onSuccess: React.useCallback(() => {
            onCleanSelectedUsers();
            reload();
        }, [onCleanSelectedUsers, reload]),
    });

    const editUsers = useCallback(
        (ids: string[]) => {
            if (ids.length === 1) {
                navigate(`/edit/${ids[0]}`);
            } else {
                compositionRoot.users.get(ids).run(
                    users => navigate(`/bulk-edit`, { state: { users: users } }),
                    error => snackbar.error(error)
                );
            }
        },
        [navigate, compositionRoot, snackbar]
    );

    const onReorderColumns = useCallback(
        (columns: Array<keyof User>) => {
            if (!visibleColumns || !columns.length) return;
            onChangeVisibleColumns(columns);
            compositionRoot.users.saveColumns(columns).run(
                () => {},
                error => snackbar.error(error)
            );
        },
        [compositionRoot, visibleColumns, onChangeVisibleColumns, snackbar]
    );

    const baseConfig = useMemo((): TableConfig<User> => {
        return {
            columns,
            details: [
                { name: "name", text: i18n.t("Name") },
                { name: "username", text: i18n.t("Username") },
                { name: "created", text: i18n.t("Created") },
                { name: "lastUpdated", text: i18n.t("Last updated") },
                { name: "lastLogin", text: i18n.t("Last login") },
                { name: "id", text: i18n.t("ID") },
                { name: "apiUrl", text: i18n.t("API URL") },
                { name: "email", text: i18n.t("Email") },
                { name: "openId", text: i18n.t("Open ID") },
                { name: "userRoles", text: i18n.t("Roles") },
                { name: "userGroups", text: i18n.t("Groups") },
                { name: "organisationUnits", text: i18n.t("OU Capture") },
                { name: "dataViewOrganisationUnits", text: i18n.t("OU Output") },
                { name: "searchOrganisationsUnits", text: i18n.t("OU Search") },
            ],
            actions: [
                {
                    name: "details",
                    text: i18n.t("Details"),
                    multiple: false,
                    primary: true,
                },
                {
                    name: "edit",
                    text: i18n.t("Edit"),
                    icon: <Icon>edit</Icon>,
                    multiple: true,
                    onClick: editUsers,
                    isActive: checkAccess(["update"]),
                },
                {
                    name: "copy_in_user",
                    text: i18n.t("Copy in user"),
                    icon: <Icon>content_copy</Icon>,
                    multiple: false,
                    onClick: users => onAction(users, "copy_in_user"),
                    isActive: checkAccess(["update"]),
                },
                {
                    name: "assign_to_org_units_capture",
                    text: i18n.t("Assign to data capture organisation units"),
                    multiple: true,
                    icon: <Icon>business</Icon>,
                    onClick: users => {
                        setSelectedUserIds(users);
                        setActionType("assign_to_org_units_capture");
                    },
                    isActive: checkAccess(["update"]),
                },
                {
                    name: "assign_to_org_units_output",
                    text: i18n.t("Assign to data view organisation units"),
                    multiple: true,
                    icon: <Icon>business</Icon>,
                    onClick: users => {
                        setSelectedUserIds(users);
                        setActionType("assign_to_org_units_output");
                    },
                    isActive: checkAccess(["update"]),
                },
                {
                    name: "assign_to_org_units_search",
                    text: i18n.t("Assign to search organisation units"),
                    multiple: true,
                    icon: <Icon>business</Icon>,
                    onClick: users => {
                        setSelectedUserIds(users);
                        setActionType("assign_to_org_units_search");
                    },
                    isActive: checkAccess(["update"]),
                },
                {
                    name: "assign_roles",
                    text: i18n.t("Assign roles"),
                    multiple: true,
                    icon: <Icon>assignment</Icon>,
                    onClick: ids =>
                        openMultiSelectorDialog({
                            type: "userRoles",
                            ids,
                            onClose: () => {
                                openMultiSelectorDialog(undefined);
                                reload();
                            },
                        }),
                    isActive: checkAccess(["update"]),
                },
                {
                    name: "assign_groups",
                    text: i18n.t("Assign groups"),
                    icon: <Icon>group_add</Icon>,
                    multiple: true,
                    onClick: ids =>
                        openMultiSelectorDialog({
                            type: "userGroups",
                            ids,
                            onClose: () => {
                                openMultiSelectorDialog(undefined);
                                reload();
                            },
                        }),
                    isActive: checkAccess(["update"]),
                },
                {
                    name: "enable",
                    text: i18n.t("Enable"),
                    icon: <Icon>playlist_add_check</Icon>,
                    multiple: true,
                    onClick: users => {
                        setSelectedUserIds(users);
                        setActionType("enable");
                    },
                    isActive: isStateActionVisible("enable"),
                },
                {
                    name: "disable",
                    text: i18n.t("Disable"),
                    icon: <Icon>block</Icon>,
                    multiple: true,
                    onClick: users => {
                        setSelectedUserIds(users);
                        setActionType("disable");
                    },
                    isActive: isStateActionVisible("disable"),
                },
                {
                    name: "remove",
                    text: i18n.t("Remove"),
                    icon: <Icon>delete</Icon>,
                    multiple: true,
                    onClick: userIds => {
                        setSelectedUserIds(userIds);
                        setActionType("remove");
                    },
                    isActive: checkAccess(["delete"]),
                },
                {
                    name: "replicate_user_from_template",
                    text: i18n.t("Replicate user from template"),
                    icon: <FileCopyIcon />,
                    multiple: false,
                    onClick: users => onAction(users, "replicate_template"),
                    isActive: () => enableReplicate,
                },
                {
                    name: "replicate_user_from_table",
                    text: i18n.t("Replicate user from table"),
                    icon: <Icon>toc</Icon>,
                    multiple: false,
                    onClick: users => onAction(users, "replicate_table"),
                    isActive: () => enableReplicate,
                },
            ],
            globalActions: [
                {
                    name: "open-settings",
                    text: i18n.t("Settings"),
                    icon: <Tune />,
                    onClick: () => openSettings(),
                },
            ],
            // TODO: Bug in ObjectsList
            initialSorting: {
                field: "firstName",
                order: "asc",
            },
            initialState: {
                sorting: {
                    field: "firstName",
                    order: "asc",
                },
            },
            paginationOptions: {
                pageSizeOptions: [10, 25, 50, 100, 500, 1000],
                pageSizeInitialValue: 25,
            },
            searchBoxLabel: i18n.t("Search by name or username..."),
            // FIXME: Disabled as long as user creation via /new does not work.
            // onActionButtonClick: () => navigate("/new"),
            onReorderColumns,
        };
    }, [openSettings, enableReplicate, editUsers, onReorderColumns, reload, onAction]);

    const refreshRows = useCallback(
        async (
            search: string,
            { page, pageSize }: TablePagination,
            sorting: TableSorting<User>
        ): Promise<{ objects: User[]; pager: Pager }> => {
            console.debug("Reloading", reloadKey, reloadTableKey);
            onChangeSearch(search);

            // SEE: src/legacy/models/userList.js LINE 29+
            if (canManage === "true") {
                const userIdList = await compositionRoot.users
                    .listAllIds({
                        search,
                        sorting,
                        filters,
                        canManage,
                        rootJunction,
                    })
                    .toPromise();

                if (userIdList) {
                    filters["id"] = ["in", userIdList];
                }
            }

            return compositionRoot.users
                .list({
                    search,
                    page,
                    pageSize,
                    sorting,
                    filters,
                    canManage,
                    rootJunction,
                })
                .toPromise();
        },
        [compositionRoot, filters, canManage, rootJunction, reloadKey, onChangeSearch, reloadTableKey]
    );

    const refreshAllIds = useCallback(
        (search: string, sorting: TableSorting<User>): Promise<string[]> => {
            return compositionRoot.users
                .listAllIds({
                    search,
                    sorting,
                    filters,
                    canManage,
                })
                .toPromise();
        },
        [compositionRoot, filters, canManage]
    );

    const tableProps = useObjectsTable(baseConfig, refreshRows, refreshAllIds);

    const columnsToShow = useMemo<TableColumn<User>[]>(() => {
        const indexes = _(visibleColumns)
            .map((columnName, idx) => [columnName, idx] as [string, number])
            .fromPairs()
            .value();

        return _(tableProps.columns)
            .map(column => ({ ...column, hidden: !visibleColumns?.includes(column.name) }))
            .sortBy(column => indexes[column.name] || 0)
            .value();
    }, [tableProps.columns, visibleColumns]);

    useEffect(
        () =>
            compositionRoot.users.getColumns().run(
                columns => {
                    setVisibleColumns(columns);
                    onChangeVisibleColumns(columns);
                },
                error => snackbar.error(error)
            ),
        [compositionRoot, snackbar, onChangeVisibleColumns]
    );

    const onSuccessUsersRemove = () => {
        onCleanSelectedUsers();
        reload();
    };

    const ouCaptureI18n = i18n.t("Assign to organisation units capture");
    const ouOutputI18n = i18n.t("Assign to organisation units output");
    const ouSearchI18n = i18n.t("Assign to organisation units search");

    const onSaveOrgUnits = React.useCallback(
        (orgUnitIds: Id[], updateStrategy: UpdateStrategy) => {
            if (users && actionType) {
                saveUsersOrgUnits(orgUnitIds, updateStrategy, users, convertActionToOrgUnitType(actionType));
            }
        },
        [actionType, users, saveUsersOrgUnits]
    );

    const generateOrgUnitTitle = React.useMemo(() => {
        if (!users || !actionType) return "";
        return i18n.t("{{action}}: {{users}} {{remainingCount}}", {
            action: buildOrgUnitTitleByAction(actionType, ouCaptureI18n, ouOutputI18n, ouSearchI18n),
            users: getFirstThreeUserNames(users).join(", "),
            remainingCount: generateMessage(users),
            nsSeparator: false,
        });
    }, [actionType, users, ouCaptureI18n, ouOutputI18n, ouSearchI18n]);

    const selectedUsers = users && users.length > 0;

    return (
        <React.Fragment>
            {multiSelectorDialogProps && <MultiSelectorDialog {...multiSelectorDialogProps} />}

            {actionType && isActionTypeEnableOrRemove(actionType) && selectedUsers && (
                <UsersSelectedModal
                    users={users}
                    isOpen={users.length > 0}
                    onSuccess={onSuccessUsersRemove}
                    onCancel={onCleanSelectedUsers}
                    actionType={actionType}
                />
            )}

            {actionType && isActionTypeOrgUnit(actionType) && selectedUsers && (
                <OrgUnitDialogSelector
                    onCancel={onCleanSelectedUsers}
                    onSave={onSaveOrgUnits}
                    title={generateOrgUnitTitle}
                    visible
                    users={users}
                    actionType={actionType}
                />
            )}

            <ObjectsList<User> {...tableProps} columns={columnsToShow}>
                {children}
            </ObjectsList>
        </React.Fragment>
    );
};

export const columns: TableColumn<User>[] = [
    { name: "id", sortable: false, text: i18n.t("User ID"), hidden: true },
    { name: "username", sortable: false, text: i18n.t("Username") },
    { name: "firstName", sortable: true, text: i18n.t("First name") },
    { name: "surname", sortable: true, text: i18n.t("Surname") },
    { name: "email", sortable: true, text: i18n.t("Email") },
    { name: "phoneNumber", text: i18n.t("Phone number") },
    { name: "openId", sortable: false, text: i18n.t("Open ID"), hidden: true },
    { name: "created", sortable: true, text: i18n.t("Created"), hidden: true },
    { name: "lastUpdated", sortable: true, text: i18n.t("Last updated"), hidden: true },
    { name: "apiUrl", sortable: false, text: i18n.t("API URL"), hidden: true },
    {
        name: "userRoles",
        sortable: false,
        text: i18n.t("Roles"),
        getValue: user => buildEllipsizedList(user.userRoles),
        hidden: true,
    },
    {
        name: "userGroups",
        sortable: false,
        text: i18n.t("Groups"),
        getValue: user => buildEllipsizedList(user.userGroups),
        hidden: true,
    },
    {
        name: "organisationUnits",
        sortable: false,
        text: i18n.t("Data capture organisation units"),
        getValue: user => buildEllipsizedList(user.organisationUnits),
    },
    {
        name: "dataViewOrganisationUnits",
        sortable: false,
        text: i18n.t("Data view organisation units"),
        getValue: user => buildEllipsizedList(user.dataViewOrganisationUnits),
    },
    {
        name: "searchOrganisationsUnits",
        sortable: false,
        text: i18n.t("Search organisation units"),
        getValue: user => buildEllipsizedList(user.searchOrganisationsUnits),
    },
    { name: "lastLogin", sortable: false, text: i18n.t("Last login") },
    {
        name: "status",
        sortable: true,
        text: i18n.t("Status"),
    },
    {
        name: "disabled",
        sortable: false,
        text: i18n.t("Disabled"),
        getValue: row => (row.disabled ? <Check /> : undefined),
    },
    {
        name: "createdBy",
        sortable: false,
        text: i18n.t("Created By"),
        getValue: row => row.createdBy?.username || "",
    },
    {
        name: "lastModifiedBy",
        sortable: false,
        text: i18n.t("Last Modified By"),
        getValue: row => row.lastModifiedBy?.username || "",
    },
];

function checkAccess(requiredKeys: string[]) {
    return (users: User[]) =>
        _(users).every(user => {
            const permissions = _(user.access).pickBy().keys().value();
            return _(requiredKeys).difference(permissions).isEmpty();
        });
}

function isStateActionVisible(action: string) {
    const currentUserHasUpdateAccessOn = checkAccess(["update"]);
    const requiredDisabledValue = action === "enable";

    return (users: User[]) =>
        currentUserHasUpdateAccessOn(users) && _(users).some(user => user.disabled === requiredDisabledValue);
}

export type UserActionName = "remove" | "disable" | "enable" | "replicate_template" | "replicate_table" | "copy_in";

export interface UserListTableProps extends Pick<ObjectsTableProps<User>, "loading"> {
    openSettings: () => void;
    filters: ListFilters;
    canManage: string;
    rootJunction: "AND" | "OR";
    onChangeVisibleColumns: (columns: string[]) => void;
    onChangeSearch: (search: string) => void;
    reloadTableKey: number;
    onAction: (ids: string[], action: UserActionName) => void;
}

function buildEllipsizedList(items: NamedRef[], limit = 3) {
    const names = items.map(item => item.name);
    const overflow = items.length - limit;
    const hasOverflow = overflow > 0;

    const buildList = (items: string[]) => items.map((item, idx) => <li key={`org-unit-${idx}`}>{item}</li>);

    return (
        <Tooltip title={buildList(names)} disableHoverListener={!hasOverflow}>
            <ul>
                {buildList(_.take(names, limit))}

                {hasOverflow && <li>{i18n.t("And {{overflow}} more...", { overflow })}</li>}
            </ul>
        </Tooltip>
    );
}
