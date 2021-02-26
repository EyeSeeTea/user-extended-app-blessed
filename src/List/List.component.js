import React, { Component } from "react";
import _ from "lodash";
import set from "lodash/fp/set";
import log from "loglevel";
import isIterable from "d2-utilizr/lib/isIterable";
import DataTable from "../data-table/DataTable.component";
import MultipleDataTable from "../components/multiple-data-table/MultipleDataTable.component";
import Pagination from "d2-ui/lib/pagination/Pagination.component";
import contextActions from "./context.actions";
import detailsStore from "./details.store";
import enableStore from "./enable.store";
import listStore from "./list.store";
import deleteUserStore from "./deleteUser.store";
import listActions from "./list.actions";
import ObserverRegistry from "../utils/ObserverRegistry.mixin";
import { getCompactTextForModels } from "../utils/i18n";
import Translate from "../utils/Translate.mixin";
import LoadingStatus from "./LoadingStatus.component";
import camelCaseToUnderscores from "d2-utilizr/lib/camelCaseToUnderscores";
import Auth from "d2-ui/lib/auth/Auth.mixin";
import orgUnitDialogStore from "./organisation-unit-dialog/organisationUnitDialogStore";
import userRolesAssignmentDialogStore from "./userRoles.store";
import userGroupsAssignmentDialogStore from "./userGroups.store";
import replicateUserStore from "./replicateUser.store";
import OrgUnitDialog from "./organisation-unit-dialog/OrgUnitDialog.component";
import UserRolesDialog from "../components/UserRolesDialog.component";
import UserGroupsDialog from "../components/UserGroupsDialog.component";
import CopyInUserDialog from "../components/CopyInUserDialog.component";
import ReplicateUserFromTemplate from "../components/ReplicateUserFromTemplate.component";
import ReplicateUserFromTable from "../components/ReplicateUserFromTable.component";
import snackActions from "../Snackbar/snack.actions";
import PropTypes from "prop-types";
import MenuItem from "material-ui/MenuItem";
import ImportExport from "../components/ImportExport.component";
import IconButton from "material-ui/IconButton";
import ViewColumnIcon from "material-ui/svg-icons/action/view-column";
import SettingsIcon from "material-ui/svg-icons/action/settings";
import TableLayout from "../components/TableLayout.component";
import Settings from "../models/settings";
import ImportTable from "../components/ImportTable.component";
import User from "../models/user";
import { saveUsers, updateUsers } from "../models/userHelpers";
import ModalLoadingMask from "../components/ModalLoadingMask.component";
import SettingsDialog from "../components/SettingsDialog.component";
import Filters from "./Filters.component";
import DetailsBoxWithScroll from "./DetailsBoxWithScroll.component";
import copyInUserStore from "./copyInUser.store";

const pageSize = 50;

// Filters out any actions `edit`, `clone` when the user can not update/edit this modelType
function actionsThatRequireCreate(action) {
    if (
        (action !== "edit" && action !== "clone") ||
        this.getCurrentUser().canUpdate(this.getModelDefinitionByName(this.props.params.modelType))
    ) {
        return true;
    }
    return false;
}

// Filters out the `delete` when the user can not delete this modelType
function actionsThatRequireDelete(action) {
    if (
        action !== "delete" ||
        this.getCurrentUser().canDelete(this.getModelDefinitionByName(this.props.params.modelType))
    ) {
        return true;
    }
    return false;
}

// TODO: Move this somewhere as a utility function, probably on the Pagination component (as a separate export) in d2-ui?
export function calculatePageValue(pager) {
    const { total, pageCount, page } = pager;
    const pageCalculationValue = total - (total - (pageCount - (pageCount - page)) * pageSize);
    const startItem = 1 + pageCalculationValue - pageSize;
    const endItem = pageCalculationValue;

    return `${startItem} - ${endItem > total ? total : endItem}`;
}

const initialSorting = ["name", "asc"];

const List = React.createClass({
    propTypes: {
        params: PropTypes.shape({
            modelType: PropTypes.string.isRequired,
        }),
    },

    mixins: [ObserverRegistry, Translate, Auth],

    maxImportUsers: 200,

    styles: {
        dataTableWrap: {
            display: "flex",
            flexDirection: "column",
            flex: 2,
        },

        detailsBoxWrap: {
            flex: 1,
            marginLeft: "1rem",
            marginRight: "1rem",
            marginBottom: "1rem",
            opacity: 1,
            flexGrow: 0,
            minWidth: "350px",
        },

        listDetailsWrap: {
            flex: 1,
            display: "flex",
            flexOrientation: "row",
        },
    },

    getInitialState() {
        return {
            listFilterOptions: {},
            dataRows: null,
            filters: {},
            pager: {
                total: 0,
            },
            isLoading: true,
            detailsObject: null,
            sorting: initialSorting,
            settingsVisible: false,
            layoutSettingsVisible: false,
            sharing: {
                model: null,
                open: false,
            },
            translation: {
                model: null,
                open: false,
            },
            orgunitassignment: {
                open: false,
            },
            assignUserRoles: {
                open: false,
            },
            assignUserGroups: {
                open: false,
            },
            replicateUser: {
                open: false,
            },
            importUsers: {
                open: false,
            },
            copyUsers: {
                open: false,
            },
        };
    },

    getDataTableRows(users) {
        const { settings } = this.state;
        const orgUnitsField = settings.get("organisationUnitsField");

        const namesFromCollection = (collection, displayField) => {
            return (
                _(collection && collection.toArray ? collection.toArray() : collection || [])
                    .map(displayField)
                    .sortBy()
                    .join(", ") || "-"
            );
        };

        return users.map(user => ({
            ...user,
            lastLogin: user.userCredentials.lastLogin,
            disabled: user.userCredentials.disabled,
            userGroups: namesFromCollection(user.userGroups, "displayName"),
            userRoles: namesFromCollection(
                user.userCredentials && user.userCredentials.userRoles,
                "displayName"
            ),
            organisationUnits: namesFromCollection(user.organisationUnits, orgUnitsField),
            dataViewOrganisationUnits: namesFromCollection(
                user.dataViewOrganisationUnits,
                orgUnitsField
            ),
            model: user,
            d2: this.context.d2,
        }));
    },

    componentWillMount() {
        Settings.build(this.context.d2).then(settings => {
            const sourceStoreDisposable = listStore.subscribe(listStoreValue => {
                if (!isIterable(listStoreValue.list)) {
                    return; // Received value is not iterable, keep waiting
                }

                this.setState({
                    dataRows: listStoreValue.list,
                    pager: listStoreValue.pager,
                    tableColumns: listStoreValue.tableColumns,
                    settings: this.state.settings || settings,
                    isLoading: false,
                });
            });
            this.registerDisposable(sourceStoreDisposable);
        });

        const detailsStoreDisposable = detailsStore.subscribe(detailsObject => {
            this.setState({ detailsObject });
        });

        const orgUnitAssignmentStoreDisposable = orgUnitDialogStore.subscribe(
            orgunitassignmentState => {
                this.setAssignState("orgunitassignment", orgunitassignmentState);
            }
        );

        const userRolesAssignmentDialogStoreDisposable = userRolesAssignmentDialogStore.subscribe(
            assignUserRoles => {
                this.setAssignState("assignUserRoles", assignUserRoles);
            }
        );

        const userGroupsAssignmentDialogStoreDisposable = userGroupsAssignmentDialogStore.subscribe(
            assignUserGroups => {
                this.setAssignState("assignUserGroups", assignUserGroups);
            }
        );

        const replicateUserDialogStoreDisposable = replicateUserStore.subscribe(replicateUser => {
            this.setAssignState("replicateUser", replicateUser);
        });

        const enableStoreDisposable = enableStore.subscribe(({ users, action }) => {
            const message = this.getTranslation(`confirm_${action}`, {
                users: getCompactTextForModels(this.context.d2, users, {
                    i18nKey: "this_and_n_others",
                    field: "username",
                    limit: 1,
                }),
            });

            snackActions.show({
                message,
                action: "confirm",
                onActionTouchTap: () => this.setUsersEnableState(users, action),
            });
        });

        const deleteUserStoreDisposable = deleteUserStore.subscribe(users => this.filterList());

        const userCopyUserDialogStoreDisposable = copyInUserStore.subscribe(copyUsers => {
            this.setAssignState("copyUsers", copyUsers);
        });

        this.registerDisposable(detailsStoreDisposable);
        this.registerDisposable(orgUnitAssignmentStoreDisposable);
        this.registerDisposable(userRolesAssignmentDialogStoreDisposable);
        this.registerDisposable(userGroupsAssignmentDialogStoreDisposable);
        this.registerDisposable(replicateUserDialogStoreDisposable);
        this.registerDisposable(deleteUserStoreDisposable);
        this.registerDisposable(enableStoreDisposable);
        this.registerDisposable(userCopyUserDialogStoreDisposable);

        this.filterList();
    },

    async setUsersEnableState(users, action) {
        const newValue = action === "disable";
        const response = await updateUsers(this.context.d2, users, user => {
            return user.userCredentials.disabled !== newValue
                ? set("userCredentials.disabled", newValue, user)
                : null;
        });

        if (response.success) {
            const count = (response.response.stats && response.response.stats.updated) || 0;
            const message = this.getTranslation(`${action}_successful`, { count });
            snackActions.show({ message });
            this.filterList();
        } else {
            const message = this.getTranslation(`${action}_error`, {
                error: response.error.toString(),
            });
            snackActions.show({ message });
        }
    },

    setAssignState(key, value) {
        this.setState(
            { [key]: value, detailsObject: null },
            () => !value.open && this.filterList({ page: this.state.pager.page })
        );
    },

    componentWillReceiveProps(newProps) {
        if (this.props.params.modelType !== newProps.params.modelType) {
            this.setState({
                isLoading: true,
                translation: Object.assign({}, this.state.translation, { open: false }),
            });
        }
    },

    _orgUnitAssignmentSaved() {
        snackActions.show({
            message: "organisation_unit_capture_assignment_saved",
            action: "ok",
            translate: true,
        });
    },

    _orgUnitAssignmentError(errorMessage) {
        log.error(errorMessage);
        snackActions.show({
            message: "organisation_unit_capture_assignment_save_error",
            translate: true,
        });
    },

    filterList({ page = 1 } = {}) {
        const order = this.state.sorting
            ? this.state.sorting[0] + ":i" + this.state.sorting[1]
            : null;
        const { pager, filters } = this.state;

        const options = {
            modelType: this.props.params.modelType,
            order: order,
            ...filters,
        };

        const paginatedOptions = {
            ...options,
            paging: true,
            page: page,
            pageSize: pageSize,
        };

        listActions.filter(paginatedOptions).subscribe(() => {}, error => log.error(error));
        this.setState({ isLoading: true, listFilterOptions: options });
    },

    onColumnSort(sorting) {
        this.setState({ sorting }, this.filterList);
    },

    convertObjsToMenuItems(objs) {
        const emptyEntry = <MenuItem key="_empty_item" value="" primaryText="" />;
        const entries = objs
            .toArray()
            .map(obj => <MenuItem key={obj.id} value={obj.id} primaryText={obj.displayName} />);
        return [emptyEntry].concat(entries);
    },

    onReplicateDialogClose() {
        replicateUserStore.setState({ open: false });
    },

    getReplicateDialog(info) {
        const componentsByType = {
            template: ReplicateUserFromTemplate,
            table: ReplicateUserFromTable,
        };
        const ReplicateComponent = componentsByType[info.type];

        if (ReplicateComponent) {
            return (
                <ReplicateComponent
                    userToReplicateId={info.user.id}
                    onRequestClose={this.onReplicateDialogClose}
                    settings={this.state.settings}
                />
            );
        } else {
            throw new Error(`Unknown replicate dialog type: ${info.type}`);
        }
    },

    _getTableActions() {
        return (
            <div>
                <IconButton
                    onTouchTap={this._openLayoutSettings}
                    tooltip={this.getTranslation("layout_settings")}
                >
                    <ViewColumnIcon />
                </IconButton>
            </div>
        );
    },

    _openSettings() {
        this.setState({ settingsVisible: true });
    },

    _closeSettings(newSettings) {
        this.setState({
            settingsVisible: false,
            ...(newSettings ? { settings: newSettings } : {}),
        });
    },

    _openLayoutSettings() {
        this.setState({ layoutSettingsVisible: true });
    },

    _closeLayoutSettings() {
        this.setState({ layoutSettingsVisible: false });
    },

    _setLayoutSettings(selectedColumns) {
        const newSettings = this.state.settings.set({ visibleTableColumns: selectedColumns });
        this.setState({ settings: newSettings });
    },

    _saveLayoutSettings() {
        this.state.settings.save().then(this._closeLayoutSettings);
    },

    _openImportTable(importResult) {
        this.setState({ importUsers: { open: true, ...importResult } });
    },

    async _importUsers(users) {
        const response = await saveUsers(this.context.d2, users);
        if (response.success) {
            const message = this.getTranslation("import_successful", { n: users.length });
            snackActions.show({ message });
            this.filterList();
            return null;
        } else {
            return response;
        }
    },

    _closeImportUsers() {
        this.setState({ importUsers: { open: false } });
    },

    _onFiltersChange(filters) {
        this.setState({ filters }, this.filterList);
    },

    render() {
        if (!this.state.dataRows) return null;
        const currentlyShown = calculatePageValue(this.state.pager);
        const { pager } = this.state;
        const { d2 } = this.context;

        const paginationProps = {
            hasNextPage: () =>
                Boolean(this.state.pager.hasNextPage) && this.state.pager.hasNextPage(),
            hasPreviousPage: () =>
                Boolean(this.state.pager.hasPreviousPage) && this.state.pager.hasPreviousPage(),
            onNextPageClick: () => {
                this.setState({ isLoading: true }, () => this.filterList({ page: pager.page + 1 }));
            },
            onPreviousPageClick: () => {
                this.setState({ isLoading: true }, () => this.filterList({ page: pager.page - 1 }));
            },
            total: this.state.pager.total,
            currentlyShown,
        };

        const rows = this.getDataTableRows(this.state.dataRows);
        const {
            assignUserRoles,
            assignUserGroups,
            replicateUser,
            listFilterOptions,
            copyUsers,
        } = this.state;
        const {
            showAllUsers,
            filterByGroups,
            filterByRoles,
            filterByOrgUnits,
            filterByOrgUnitsOutput,
        } = this.state;
        const { importUsers } = this.state;
        const { settings, settingsVisible, layoutSettingsVisible, tableColumns } = this.state;
        const { styles } = this;

        const allColumns = tableColumns.map(c => ({
            text: this.getTranslation(camelCaseToUnderscores(c.name)),
            value: c.name,
        }));

        const visibleColumns = _(tableColumns)
            .keyBy("name")
            .at(settings.get("visibleTableColumns"))
            .compact()
            .value();

        return (
            <div>
                <div className="controls-wrapper">
                    <Filters onChange={this._onFiltersChange} />

                    <div className="user-management-control pagination">
                        <Pagination {...paginationProps} />

                        <ImportExport
                            d2={d2}
                            columns={settings.get("visibleTableColumns")}
                            filterOptions={listFilterOptions}
                            onImport={this._openImportTable}
                            maxUsers={this.maxImportUsers}
                            settings={settings}
                        />

                        <IconButton
                            onTouchTap={this._openSettings}
                            tooltip={this.getTranslation("settings")}
                        >
                            <SettingsIcon />
                        </IconButton>
                    </div>
                </div>

                <LoadingStatus
                    loadingText={["Loading", this.props.params.modelType, "list..."].join(" ")}
                    isLoading={this.state.isLoading}
                />
                <div style={styles.listDetailsWrap}>
                    <div style={styles.dataTableWrap}>
                        <MultipleDataTable
                            rows={rows}
                            columns={visibleColumns}
                            contextActions={contextActions}
                            onColumnSort={this.onColumnSort}
                            isMultipleSelectionAllowed={true}
                            showSelectColumn={true}
                            tableActions={this._getTableActions()}
                        />
                        {this.state.dataRows.length || this.state.isLoading ? null : (
                            <div>No results found</div>
                        )}
                    </div>
                    {this.state.detailsObject ? (
                        <DetailsBoxWithScroll
                            style={styles.detailsBoxWrap}
                            detailsObject={this.state.detailsObject}
                            onClose={listActions.hideDetailsBox}
                        />
                    ) : null}
                </div>

                {this.state.orgunitassignment.open ? (
                    <OrgUnitDialog
                        models={this.state.orgunitassignment.users}
                        open={true}
                        onRequestClose={this._closeOrgUnitDialog}
                        title={this.state.orgunitassignment.title}
                        field={this.state.orgunitassignment.field}
                        roots={this.state.orgunitassignment.roots}
                        onOrgUnitAssignmentSaved={this._orgUnitAssignmentSaved}
                        onOrgUnitAssignmentError={this._orgUnitAssignmentError}
                    />
                ) : null}

                {assignUserRoles.open ? (
                    <UserRolesDialog
                        users={assignUserRoles.users}
                        onRequestClose={() =>
                            userRolesAssignmentDialogStore.setState({ open: false })
                        }
                    />
                ) : null}

                {copyUsers.open ? (
                    <CopyInUserDialog
                        user={copyUsers.user}
                        onRequestClose={() => copyInUserStore.setState({ open: false })}
                    />
                ) : null}

                {assignUserGroups.open ? (
                    <UserGroupsDialog
                        users={assignUserGroups.users}
                        onRequestClose={() =>
                            userGroupsAssignmentDialogStore.setState({ open: false })
                        }
                    />
                ) : null}

                {layoutSettingsVisible && (
                    <TableLayout
                        options={allColumns}
                        selected={visibleColumns.map(c => c.name)}
                        onChange={this._setLayoutSettings}
                        onSave={this._saveLayoutSettings}
                        onClose={this._closeLayoutSettings}
                    />
                )}

                {settingsVisible && (
                    <SettingsDialog settings={settings} onRequestClose={this._closeSettings} />
                )}

                {replicateUser.open ? this.getReplicateDialog(replicateUser) : null}

                {!importUsers.open ? null : (
                    <ImportTable
                        title={this.getTranslation("import")}
                        onSave={this._importUsers}
                        onRequestClose={this._closeImportUsers}
                        actionText={this.getTranslation("import")}
                        users={importUsers.users}
                        columns={importUsers.columns}
                        warnings={importUsers.warnings}
                        maxUsers={this.maxImportUsers}
                        settings={this.state.settings}
                    />
                )}
            </div>
        );
    },

    _closeOrgUnitDialog() {
        orgUnitDialogStore.setState(
            Object.assign({}, orgUnitDialogStore.state, {
                open: false,
            })
        );
    },
});

List.contextTypes = {
    d2: PropTypes.object.isRequired,
};

export default List;
