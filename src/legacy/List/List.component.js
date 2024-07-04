import IconButton from "material-ui/IconButton";
import MenuItem from "material-ui/MenuItem";
import ViewColumnIcon from "material-ui/svg-icons/action/view-column";
import PropTypes from "prop-types";
import React from "react";
import { UserListTable } from "../../webapp/components/user-list-table/UserListTable";
import { ImportExport } from "../../webapp/components/import-export/ImportExport";
import ImportTable from "../components/ImportTable.component";
import ReplicateUserFromTable from "../components/ReplicateUserFromTable.component";
import ReplicateUserFromTemplate from "../components/ReplicateUserFromTemplate.component";
import SettingsDialog from "../components/SettingsDialog.component";
import Settings from "../models/settings";
import { saveUsers } from "../models/userHelpers";
import snackActions from "../Snackbar/snack.actions";
import Filters from "./Filters.component";

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
        snackActions.hide();
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
            reloadTableKey: 1,
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

        this.filterList();
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

    reloadTable = () => {
        this.setState({ reloadTableKey: this.state.reloadTableKey + 1 });
    };

    filterList = () => {
        const sorting = this.state.sorting ? { field: this.state.sorting[0], order: this.state.sorting[1] } : undefined;
        const { filters, query } = this.state;

        this.setState({ isLoading: true, listFilterOptions: { sorting, search: query, ...filters } });
    };

    convertObjsToMenuItems = objs => {
        const emptyEntry = <MenuItem key="_empty_item" value="" primaryText="" />;
        const entries = objs
            .toArray()
            .map(obj => <MenuItem key={obj.id} value={obj.id} primaryText={obj.displayName} />);
        return [emptyEntry].concat(entries);
    };

    onReplicateDialogClose = () => {
        this.setState({
            reloadTableKey: this.state.reloadTableKey + 1,
            replicateUser: { open: false, users: [] },
        });
    };

    getReplicateDialog = info => {
        const componentsByType = {
            replicate_template: ReplicateUserFromTemplate,
            replicate_table: ReplicateUserFromTable,
        };
        const ReplicateComponent = componentsByType[info.action];

        if (ReplicateComponent) {
            return (
                <ReplicateComponent
                    userToReplicateId={info.user}
                    onRequestClose={this.onReplicateDialogClose}
                    settings={this.state.settings}
                    api={this.props.api}
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
        const response = await saveUsers(this.context.d2, users, this.props.api);
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

    _onAction = async (ids, action) => {
        if (action === "replicate_table" || action === "replicate_template") {
            this.setAssignState("replicateUser", { user: ids[0], open: true, action });
        } else if (action === "copy_in_user") {
            this.setAssignState("copyUsers", { users: ids, open: true, action });
        }
    };

    render() {
        const { replicateUser, listFilterOptions, importUsers, settings, settingsVisible } = this.state;

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
                            reloadTableKey={this.state.reloadTableKey}
                            onAction={this._onAction}
                        >
                            <Filters onChange={this._onFiltersChange} showSearch={false} api={this.props.api} />

                            <div className="user-management-control pagination" style={{ order: 11 }}>
                                {settings && (
                                    <ImportExport
                                        columns={this.state.visibleColumns}
                                        filterOptions={listFilterOptions}
                                        onImport={this._openImportTable}
                                        maxUsers={this.maxImportUsers}
                                        settings={settings}
                                    />
                                )}
                            </div>
                        </UserListTable>
                    </div>
                </div>

                {settingsVisible && <SettingsDialog settings={settings} onRequestClose={this._closeSettings} />}

                {replicateUser.open ? this.getReplicateDialog(replicateUser) : null}

                {!importUsers.open ? null : (
                    <ImportTable
                        api={this.props.api}
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
}
