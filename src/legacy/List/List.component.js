import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import set from "lodash/fp/set";
import log from "loglevel";
import IconButton from "material-ui/IconButton";
import MenuItem from "material-ui/MenuItem";
import ViewColumnIcon from "material-ui/svg-icons/action/view-column";
import PropTypes from "prop-types";
import React from "react";
import i18n from "../../locales";
import { UserListTable } from "../../webapp/components/user-list-table/UserListTable";
import CopyInUserDialog from "../components/CopyInUserDialog.component";
import ImportExport from "../components/ImportExport.component";
import ImportTable from "../components/ImportTable.component";
import ReplicateUserFromTable from "../components/ReplicateUserFromTable.component";
import ReplicateUserFromTemplate from "../components/ReplicateUserFromTemplate.component";
import SettingsDialog from "../components/SettingsDialog.component";
import Settings from "../models/settings";
import { getExistingUsers, saveUsers, updateUsers } from "../models/userHelpers";
import snackActions from "../Snackbar/snack.actions";
import { getCompactTextForModels } from "../utils/i18n";
import copyInUserStore from "./copyInUser.store";
import deleteUserStore from "./deleteUser.store";
import enableStore from "./enable.store";
import Filters from "./Filters.component";
import orgUnitDialogStore from "./organisation-unit-dialog/organisationUnitDialogStore";
import OrgUnitDialog from "./organisation-unit-dialog/OrgUnitDialog.component";
import replicateUserStore from "./replicateUser.store";

const initialSorting = ["name", "asc"];

export class ListHybrid extends React.Component {
    static contextTypes = {
        d2: PropTypes.object.isRequired,
    };

    maxImportUsers = 500;

    styles = {
        dataTableWrap: {
            display: "flex",
            flexDirection: "column",
            flex: 2,
        },
        listDetailsWrap: {
            flex: 1,
            display: "flex",
            flexOrientation: "row",
        },
    };

    componentWillUnmount = () => {
        this.observerDisposables.forEach(disposable => disposable.dispose?.());
    };

    registerDisposable = disposable => {
        this.observerDisposables.push(disposable);
    };

    getTranslation = (...args) => {
        return this.context.d2.i18n.getTranslation(...args);
    };

    constructor(props, context) {
        super(props, context);

        this.state = {
            listFilterOptions: {},
            filters: {},
            pager: {
                total: 0,
            },
            isLoading: true,
            sorting: initialSorting,
            settingsVisible: false,
            visibleColumns: [],
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
            replicateUser: {
                open: false,
            },
            importUsers: {
                open: false,
            },
            copyUsers: {
                open: false,
            },
            disableUsers: {
                open: false,
                users: [],
                action: "",
            },
            removeUsers: {
                open: false,
                users: [],
            },
        };
    }

    componentWillMount = () => {
        this.observerDisposables = [];

        Settings.build(this.context.d2).then(settings => {
            this.setState({
                settings: this.state.settings || settings,
                isLoading: false,
            });
        });

        const orgUnitAssignmentStoreDisposable = orgUnitDialogStore.subscribe(orgunitassignmentState => {
            this.setAssignState("orgunitassignment", orgunitassignmentState);
        });

        const replicateUserDialogStoreDisposable = replicateUserStore.subscribe(replicateUser => {
            this.setAssignState("replicateUser", replicateUser);
        });

        const enableStoreDisposable = enableStore.subscribe(async ({ users, action }) => {
            const existingUsers = await getExistingUsers(this.context.d2, {
                fields: ":owner",
                filter: "id:in:[" + users.join(",") + "]",
            });
            this.setState({ disableUsers: { open: true, users: existingUsers, action } });
        });

        const deleteUserStoreDisposable = deleteUserStore.subscribe(async ({ users }) => {
            if (users !== undefined) {
                const existingUsers = await getExistingUsers(this.context.d2, {
                    fields: ":owner,userCredentials",
                    filter: "id:in:[" + users.join(",") + "]",
                });
                this.setState({ removeUsers: { open: true, users: existingUsers } });
            }
            this.filterList();
        });

        const userCopyUserDialogStoreDisposable = copyInUserStore.subscribe(copyUsers => {
            this.setAssignState("copyUsers", copyUsers);
        });

        this.registerDisposable(orgUnitAssignmentStoreDisposable);
        this.registerDisposable(replicateUserDialogStoreDisposable);
        this.registerDisposable(deleteUserStoreDisposable);
        this.registerDisposable(enableStoreDisposable);
        this.registerDisposable(userCopyUserDialogStoreDisposable);

        this.filterList();
    };

    setUsersEnableState = async (users, action) => {
        const newValue = action === "disable";
        const response = await updateUsers(this.context.d2, users, user => {
            if (user?.userCredentials?.disabled !== newValue) {
                return set("disabled", newValue, set("userCredentials.disabled", newValue, user));
            } else {
                return null;
            }
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
        this.setState({ disableUsers: { open: false, users: [], action: "" } });
    };

    setAssignState = (key, value) => {
        this.setState({ [key]: value }, () => !value.open && this.filterList({ page: this.state.pager.page }));
    };

    componentWillReceiveProps(newProps) {
        if (this.props.params.modelType !== newProps.params.modelType) {
            this.setState({
                isLoading: true,
                translation: Object.assign({}, this.state.translation, { open: false }),
            });
        }
    }

    _orgUnitAssignmentSaved = () => {
        snackActions.show({
            message: "organisation_unit_capture_assignment_saved",
            action: "ok",
            translate: true,
        });
    };

    _orgUnitAssignmentError = errorMessage => {
        log.error(errorMessage);
        snackActions.show({
            message: "organisation_unit_capture_assignment_save_error",
            translate: true,
        });
    };

    filterList = () => {
        const order = this.state.sorting ? this.state.sorting[0] + ":i" + this.state.sorting[1] : null;
        const { filters, query } = this.state;

        this.setState({ isLoading: true, listFilterOptions: { order: order, query: query, ...filters } });
    };

    convertObjsToMenuItems = objs => {
        const emptyEntry = <MenuItem key="_empty_item" value="" primaryText="" />;
        const entries = objs
            .toArray()
            .map(obj => <MenuItem key={obj.id} value={obj.id} primaryText={obj.displayName} />);
        return [emptyEntry].concat(entries);
    };

    onReplicateDialogClose = () => {
        replicateUserStore.setState({ open: false });
    };

    getReplicateDialog = info => {
        const componentsByType = {
            template: ReplicateUserFromTemplate,
            table: ReplicateUserFromTable,
        };
        const ReplicateComponent = componentsByType[info.type];

        if (ReplicateComponent) {
            return (
                <ReplicateComponent
                    userToReplicateId={info.user}
                    onRequestClose={this.onReplicateDialogClose}
                    settings={this.state.settings}
                />
            );
        } else {
            throw new Error(`Unknown replicate dialog type: ${info.type}`);
        }
    };

    _getTableActions = () => {
        return (
            <div>
                <IconButton onClick={this._openLayoutSettings} tooltip={this.getTranslation("layout_settings")}>
                    <ViewColumnIcon />
                </IconButton>
            </div>
        );
    };

    _openSettings = () => {
        this.setState({ settingsVisible: true });
    };

    _closeSettings = newSettings => {
        this.setState({
            settingsVisible: false,
            ...(newSettings ? { settings: newSettings } : {}),
        });
    };

    _updateVisibleColumns = visibleColumns => {
        this.setState({ visibleColumns });
    };

    _updateQuery = query => {
        this.setState({ query }, this.filterList);
    };

    _openImportTable = importResult => {
        this.setState({ importUsers: { open: true, ...importResult } });
    };

    _importUsers = async users => {
        const response = await saveUsers(this.context.d2, users);
        if (response.success) {
            const message = this.getTranslation("import_successful", { n: users.length });
            snackActions.show({ message });
            this.filterList();
            return null;
        } else {
            return response;
        }
    };

    _closeImportUsers = () => {
        this.setState({ importUsers: { open: false } });
    };

    _onFiltersChange = filters => {
        const canManage = filters.canManage;
        this.setState({ filters, canManage }, this.filterList);
    };

    _disableUsersSaved = () => this.setUsersEnableState(this.state.disableUsers.users, this.state.disableUsers.action);

    _disableUsersCancel = () => this.setState({ disableUsers: { open: false } });

    _removeUsersSaved = () => {
        this.setState({ removeUsers: { open: false, users: [] } });
        deleteUserStore.delete(this.state.removeUsers.users);
    };

    _removeUsersCancel = () => this.setState({ removeUsers: { open: false } });

    render() {
        const { d2 } = this.context;

        const {
            replicateUser,
            listFilterOptions,
            copyUsers,
            removeUsers,
            disableUsers,
            importUsers,
            settings,
            settingsVisible,
        } = this.state;

        return (
            <div>
                <div style={this.styles.listDetailsWrap}>
                    <div style={this.styles.dataTableWrap}>
                        <UserListTable
                            loading={this.state.isLoading}
                            openSettings={this._openSettings}
                            filters={this.state.filters?.filters}
                            canManage={this.state?.canManage}
                            rootJunction={this.state.filters?.rootJunction}
                            onChangeVisibleColumns={this._updateVisibleColumns}
                            onChangeSearch={this._updateQuery}
                        >
                            <Filters onChange={this._onFiltersChange} showSearch={false} api={this.props.api} />

                            <div className="user-management-control pagination" style={{ order: 11 }}>
                                <ImportExport
                                    d2={d2}
                                    columns={this.state.visibleColumns}
                                    filterOptions={listFilterOptions}
                                    onImport={this._openImportTable}
                                    maxUsers={this.maxImportUsers}
                                    settings={settings}
                                />
                            </div>
                        </UserListTable>
                    </div>
                </div>

                {this.state.orgunitassignment.open && this.state.orgunitassignment.field === "organisationUnits" ? (
                    <OrgUnitDialog
                        api={this.props.api}
                        models={this.state.orgunitassignment.users}
                        open={true}
                        onRequestClose={this._closeOrgUnitDialog}
                        title={this.state.orgunitassignment.title}
                        field={this.state.orgunitassignment.field}
                        roots={this.state.orgunitassignment.roots}
                        onOrgUnitAssignmentSaved={this._orgUnitAssignmentSaved}
                        onOrgUnitAssignmentError={this._orgUnitAssignmentError}
                        filteringByNameLabel={this.getTranslation("filter_organisation_units_capture_by_name")}
                        orgUnitsSelectedLabel={this.getTranslation("organisation_units_capture_selected")}
                    />
                ) : null}

                {this.state.orgunitassignment.open &&
                this.state.orgunitassignment.field === "dataViewOrganisationUnits" ? (
                    <OrgUnitDialog
                        api={this.props.api}
                        models={this.state.orgunitassignment.users}
                        open={true}
                        onRequestClose={this._closeOrgUnitDialog}
                        title={this.state.orgunitassignment.title}
                        field={this.state.orgunitassignment.field}
                        roots={this.state.orgunitassignment.roots}
                        onOrgUnitAssignmentSaved={this._orgUnitAssignmentSaved}
                        onOrgUnitAssignmentError={this._orgUnitAssignmentError}
                        filteringByNameLabel={this.getTranslation("filter_organisation_units_output_by_name")}
                        orgUnitsSelectedLabel={this.getTranslation("organisation_units_output_selected")}
                    />
                ) : null}

                {disableUsers.open ? (
                    <ConfirmationDialog
                        isOpen={disableUsers.open}
                        onSave={this._disableUsersSaved}
                        onCancel={this._disableUsersCancel}
                        title={disableUsers.action === "enable" ? i18n.t("Enable users") : i18n.t("Disable users")}
                        description={this.getTranslation(`confirm_${disableUsers.action}`, {
                            users: getCompactTextForModels(this.context.d2, disableUsers.users, {
                                i18nKey: "this_and_n_others",
                                field: "userCredentials.username",
                                limit: 1,
                            }),
                        })}
                        saveText={"Confirm"}
                    />
                ) : null}

                {copyUsers.open ? (
                    <CopyInUserDialog
                        user={copyUsers.user}
                        onCancel={() => copyInUserStore.setState({ open: false })}
                    />
                ) : null}

                {removeUsers.open ? (
                    <ConfirmationDialog
                        isOpen={removeUsers.open}
                        onSave={this._removeUsersSaved}
                        onCancel={this._removeUsersCancel}
                        title={i18n.t("Remove users")}
                        description={this.getTranslation("confirm_delete_users", {
                            users: getCompactTextForModels(this.context.d2, this.state.removeUsers.users, {
                                i18nKey: "this_and_n_others",
                                field: "userCredentials.username",
                                limit: 1,
                            }),
                        })}
                        saveText={"Confirm"}
                    />
                ) : null}

                {settingsVisible && <SettingsDialog settings={settings} onRequestClose={this._closeSettings} />}

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
    }

    _closeOrgUnitDialog = () => {
        orgUnitDialogStore.setState(
            Object.assign({}, orgUnitDialogStore.state, {
                open: false,
            })
        );
    };
}
