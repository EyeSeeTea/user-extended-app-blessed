import React, { Component } from 'react';
import _ from 'lodash';
import log from 'loglevel';
import isIterable from 'd2-utilizr/lib/isIterable';
import DataTable from '../data-table/DataTable.component';
import MultipleDataTable from '../components/multiple-data-table/MultipleDataTable.component';
import Pagination from 'd2-ui/lib/pagination/Pagination.component';
import DetailsBox from './DetailsBox.component';
import contextActions from './context.actions';
import detailsStore from './details.store';
import listStore from './list.store';
import deleteUserStore from './deleteUser.store';
import listActions from './list.actions';
import ObserverRegistry from '../utils/ObserverRegistry.mixin';
import Paper from 'material-ui/Paper/Paper';
import Translate from '../utils/Translate.mixin';
import SearchBox from './SearchBox.component';
import LoadingStatus from './LoadingStatus.component';
import camelCaseToUnderscores from 'd2-utilizr/lib/camelCaseToUnderscores';
import Auth from 'd2-ui/lib/auth/Auth.mixin';
import orgUnitDialogStore from './organisation-unit-dialog/organisationUnitDialogStore';
import userRolesAssignmentDialogStore from './userRoles.store';
import userGroupsAssignmentDialogStore from './userGroups.store';
import replicateUserStore from './replicateUser.store';
import OrgUnitDialog from './organisation-unit-dialog/OrgUnitDialog.component';
import UserRolesDialog from '../components/UserRolesDialog.component';
import UserGroupsDialog from '../components/UserGroupsDialog.component';
import ReplicateUserFromTemplate from '../components/ReplicateUserFromTemplate.component';
import ReplicateUserFromTable from '../components/ReplicateUserFromTable.component';
import snackActions from '../Snackbar/snack.actions';
import Heading from 'd2-ui/lib/headings/Heading.component';
import Checkbox from 'material-ui/Checkbox/Checkbox';
import { Observable } from 'rx';
import PropTypes from 'prop-types';
import MenuItem from 'material-ui/MenuItem';
import MultipleFilter from '../components/MultipleFilter.component';
import ImportExport from '../components/ImportExport.component';
import IconButton from 'material-ui/IconButton';
import SettingsIcon from 'material-ui/svg-icons/action/settings';
import TableLayout from '../components/TableLayout.component';
import Settings from '../models/settings';
import ImportTable from '../components/ImportTable.component';
import User from '../models/user';
import { saveUsers } from '../models/userHelpers';
import OrgUnitsFilter from '../components/OrgUnitsFilter.component';
import ModalLoadingMask from '../components/ModalLoadingMask.component';
import FilterListIcon from 'material-ui/svg-icons/content/filter-list';
import ClearIcon from 'material-ui/svg-icons/content/clear';
import AnimateHeight from 'react-animate-height';

const pageSize = 50;

// Filters out any actions `edit`, `clone` when the user can not update/edit this modelType
function actionsThatRequireCreate(action) {
    if ((action !== 'edit' && action !== 'clone') || this.getCurrentUser().canUpdate(this.getModelDefinitionByName(this.props.params.modelType))) {
        return true;
    }
    return false;
}

// Filters out the `delete` when the user can not delete this modelType
function actionsThatRequireDelete(action) {
    if (action !== 'delete' || this.getCurrentUser().canDelete(this.getModelDefinitionByName(this.props.params.modelType))) {
        return true;
    }
    return false;
}

// TODO: Move this somewhere as a utility function, probably on the Pagination component (as a separate export) in d2-ui?
export function calculatePageValue(pager) {
    const { total, pageCount, page } = pager;
    const pageCalculationValue = total - (total - ((pageCount - (pageCount - page)) * pageSize));
    const startItem = 1 + pageCalculationValue - pageSize;
    const endItem = pageCalculationValue;

    return `${startItem} - ${endItem > total ? total : endItem}`;
}

class DetailsBoxWithScroll extends Component {

    componentDidMount() {
        this.disposable = Observable
            .fromEvent(global, 'scroll')
            .debounce(200)
            .map(() => document.querySelector('body').scrollTop)
            .subscribe(() => this.forceUpdate());
    }

    componentWillUnmount() {
        this.disposable && this.disposable.dispose();
    }

    render() {
        return (
            <div style={this.props.style}>
                <Paper zDepth={1} rounded={false} style={{ maxWidth: 500, minWidth: 300, marginTop: document.querySelector('body').scrollTop }}>
                    <DetailsBox
                        source={this.props.detailsObject.model}
                        showDetailBox={!!this.props.detailsObject}
                        onClose={this.props.onClose}
                    />
                </Paper>
            </div>
        );
    }
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
            display: 'flex',
            flexDirection: 'column',
            flex: 2,
        },

        detailsBoxWrap: {
            flex: 1,
            marginLeft: '1rem',
            marginRight: '1rem',
            marginBottom: '1rem',
            opacity: 1,
            flexGrow: 0,
            minWidth: '350px'
        },

        listDetailsWrap: {
            flex: 1,
            display: 'flex',
            flexOrientation: 'row',
        },

        filterStyles: {
            textField: {
                width: "90%",
            },
        },
        animationVisible: {
            width: 850,
        },
        animationHidden: {
            width: 0,
        },
    },

    getInitialState() {
        return {
            listFilterOptions: {},
            dataRows: null,
            pager: {
                total: 0,
            },
            isLoading: true,
            detailsObject: null,
            searchString: "",
            searchStringClear: null,
            userGroups: [],
            userRoles: [],
            filterByRoles: [],
            filterByGroups: [],
            filterByOrgUnits: [],
            filterByOrgUnitsOutput: [],
            sorting: initialSorting,
            layoutSettingsVisible: false,
            showOnlyManagedUsers: false,
            showExtendedFilters: false,
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
        };
    },

    getDataTableRows(users) {
        const namesFromCollection = collection => {
            return _(collection && collection.toArray ? collection.toArray() : (collection || []))
                .map("displayName")
                .sortBy()
                .join(", ") || "-";
        };

        return users.map(user => ({
            ...user,
            lastLogin: user.userCredentials.lastLogin,
            userGroups: namesFromCollection(user.userGroups),
            organisationUnits: namesFromCollection(user.organisationUnits),
            dataViewOrganisationUnits: namesFromCollection(user.dataViewOrganisationUnits),
            userRoles: namesFromCollection(user.userCredentials && user.userCredentials.userRoles),
            model: user,
            d2: this.context.d2,
        }));
    },

    componentWillMount() {
        Settings.build(this.context.d2).then(settings => {
            const sourceStoreDisposable = listStore
                .subscribe(listStoreValue => {
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

        /** load select fields data */
        listActions.loadUserRoles.next();
        listActions.loadUserGroups.next();

        /** Set user roles list for filter by role */
        const rolesStoreDisposable = listStore.listRolesSubject.subscribe(userRoles => {
            this.setState({ userRoles: userRoles.toArray().map(role => ({value: role.id, text: role.displayName})) });
        });

        /** Set user groups list for filter by group */
        const groupsStoreDisposable = listStore.listGroupsSubject.subscribe(userGroups => {
            this.setState({ userGroups: userGroups.toArray().map(role => ({value: role.id, text: role.displayName})) });
        });

        const detailsStoreDisposable = detailsStore.subscribe(detailsObject => {
            this.setState({ detailsObject });
        });

        const orgUnitAssignmentStoreDisposable = orgUnitDialogStore.subscribe(orgunitassignmentState => {
            this.setAssignState("orgunitassignment", orgunitassignmentState);
        });

        const userRolesAssignmentDialogStoreDisposable = userRolesAssignmentDialogStore.subscribe(assignUserRoles => {
            this.setAssignState("assignUserRoles", assignUserRoles);
        });

        const userGroupsAssignmentDialogStoreDisposable = userGroupsAssignmentDialogStore.subscribe(assignUserGroups => {
            this.setAssignState("assignUserGroups", assignUserGroups);
        });

        const replicateUserDialogStoreDisposable = replicateUserStore.subscribe(replicateUser => {
            this.setAssignState("replicateUser", replicateUser);
        });

        const deleteUserStoreDisposable = deleteUserStore.subscribe(users => this.filterList());

        this.registerDisposable(detailsStoreDisposable);
        this.registerDisposable(orgUnitAssignmentStoreDisposable);
        this.registerDisposable(rolesStoreDisposable);
        this.registerDisposable(groupsStoreDisposable);
        this.registerDisposable(userRolesAssignmentDialogStoreDisposable);
        this.registerDisposable(userGroupsAssignmentDialogStoreDisposable);
        this.registerDisposable(replicateUserDialogStoreDisposable);
        this.registerDisposable(deleteUserStoreDisposable);

        this.filterList();
    },

    setAssignState(key, value) {
        this.setState({[key]: value, detailsObject: null},
            () => !value.open && this.filterList({ page: this.state.pager.page }));
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
        snackActions.show({ message: 'organisation_unit_assignment_saved', action: 'ok', translate: true });
    },

    _orgUnitAssignmentError(errorMessage) {
        log.error(errorMessage);
        snackActions.show({ message: 'organisation_unit_assignment_save_error', translate: true });
    },

    filterList({page = 1} = {}) {
        const order = this.state.sorting
            ? (this.state.sorting[0] + ":i" + this.state.sorting[1])
            : null;
        const { filterByRoles, filterByGroups, filterByOrgUnits, filterByOrgUnitsOutput } = this.state;
        const { showOnlyManagedUsers, pager, searchString } = this.state;
        const inFilter = (field) => _(field).isEmpty() ? null : ["in", field];

        const options = {
            modelType: this.props.params.modelType,
            canManage: showOnlyManagedUsers,
            order: order,
            query: searchString,
            filters: {
                "userCredentials.userRoles.id": inFilter(filterByRoles),
                "userGroups.id": inFilter(filterByGroups),
                "organisationUnits.id": inFilter(filterByOrgUnits.map(ou => ou.id)),
                "dataViewOrganisationUnits.id": inFilter(filterByOrgUnitsOutput.map(ou => ou.id)),
            },
        };
        
        const paginatedOptions = {
            ...options,
            paging: true,
            page: page,
            pageSize: pageSize,
        };

        listActions.filter(paginatedOptions).subscribe(() => {}, error => log.error(error));
        this.setState({ listFilterOptions: options });
    },

    onColumnSort(sorting) {
        this.setState({sorting}, this.filterList);
    },

    searchListByName(searchObserver) {
        const searchListByNameDisposable = searchObserver
            .subscribe((value) => {
                this.setState({
                    isLoading: true,
                    searchString: value
                }, this.filterList);
            });

        this.registerDisposable(searchListByNameDisposable);
    },

    _onCanManageClick(ev, isChecked) {
        this.setState({showOnlyManagedUsers: isChecked}, this.filterList);
    },

    setFilterRoles(roles) {
        this.setState({filterByRoles: roles}, this.filterList);
    },

    setFilterGroups(groups) {
        this.setState({filterByGroups: groups}, this.filterList);
    },

    setFilterOrgUnits(orgUnits) {
        this.setState({filterByOrgUnits: orgUnits}, this.filterList);
    },

    setFilterOrgUnitsOutput(orgUnits) {
        this.setState({filterByOrgUnitsOutput: orgUnits}, this.filterList);
    },

    convertObjsToMenuItems(objs) {
        const emptyEntry = <MenuItem key="_empty_item" value="" primaryText="" />;
        const entries = objs.toArray()
            .map(obj => <MenuItem key={obj.id} value={obj.id} primaryText={obj.displayName} />);
        return [emptyEntry].concat(entries);
    },

    onReplicateDialogClose() {
        replicateUserStore.setState({open: false});
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
                />
            );
        } else {
            throw new Error(`Unknown replicate dialog type: ${info.type}`);
        }
    },

    _getTableActions() {
        return (
            <div>
                <IconButton onTouchTap={this._openLayoutSettings} tooltip={this.getTranslation("layout_settings")}>
                  <SettingsIcon />
                </IconButton>
            </div>
        );
    },

    _openLayoutSettings() {
        this.setState({ layoutSettingsVisible: true });
    },

    _closeLayoutSettings() {
        this.setState({ layoutSettingsVisible: false });
    },

    _setLayoutSettings(selectedColumns) {
        const newSettings = this.state.settings.setVisibleTableColumns(selectedColumns);
        this.setState({ settings: newSettings });
    },

    _saveLayoutSettings() {
        this.state.settings.save().then(this._closeLayoutSettings);
    },

    _toggleExtendedFilters() {
        this.setState({showExtendedFilters: !this.state.showExtendedFilters});
    },

    _clearFilters() {
        this.setState({
            showOnlyManagedUsers: false,
            searchStringClear: new Date(),
            filterByGroups: [],
            filterByRoles: [],
            filterByOrgUnits: [],
            filterByOrgUnitsOutput: [],
        }, this.filterList);
    },

    _openImportTable(importResult) {
        this.setState({ importUsers: { open: true, ...importResult }});
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
        this.setState({ importUsers: { open: false }});
    },

    render() {
        if (!this.state.dataRows)
            return null;
        const currentlyShown = calculatePageValue(this.state.pager);
        const { pager } = this.state;
        const { d2 } = this.context;

        const paginationProps = {
            hasNextPage: () => Boolean(this.state.pager.hasNextPage) && this.state.pager.hasNextPage(),
            hasPreviousPage: () => Boolean(this.state.pager.hasPreviousPage) && this.state.pager.hasPreviousPage(),
            onNextPageClick: () => {
                this.setState({ isLoading: true }, () => this.filterList({page: pager.page + 1}));
            },
            onPreviousPageClick: () => {
                this.setState({ isLoading: true }, () => this.filterList({page: pager.page - 1}));
            },
            total: this.state.pager.total,
            currentlyShown,
        };

        const rows = this.getDataTableRows(this.state.dataRows);
        const { assignUserRoles, assignUserGroups, replicateUser, showExtendedFilters, listFilterOptions } = this.state;
        const { showOnlyManagedUsers, searchString, searchStringClear } = this.state;
        const { filterByGroups, filterByRoles, filterByOrgUnits, filterByOrgUnitsOutput } = this.state;
        const { importUsers } = this.state;
        const { settings, layoutSettingsVisible, tableColumns } = this.state;
        const isExtendedFiltering = !_([
            filterByGroups,
            filterByRoles,
            filterByOrgUnits,
            filterByOrgUnitsOutput,
        ]).every(_.isEmpty)
        const isFiltering = showOnlyManagedUsers || searchString || isExtendedFiltering;
        const filterIconColor = isExtendedFiltering ? "#ff9800" : undefined;
        const filterButtonColor = showExtendedFilters ? {backgroundColor: '#cdcdcd'} : undefined;
        const { styles } = this;

        const allColumns = tableColumns.map(c => ({
            text: this.getTranslation(camelCaseToUnderscores(c.name)),
            value: c.name,
        }));

        const visibleColumns = _(tableColumns)
            .keyBy("name")
            .at(settings.getVisibleTableColumns())
            .value();

        return (
            <div>
                <div className="controls-wrapper">
                    <div className="user-management-controls" style={{flex: 'unset'}}>
                        <div className="user-management-control search-box">
                            <SearchBox clear={searchStringClear} searchObserverHandler={this.searchListByName} />

                            <Checkbox
                                className="control-checkbox"
                                label={this.getTranslation('display_only_users_can_manage')}
                                onCheck={this._onCanManageClick}
                                checked={showOnlyManagedUsers}
                            />

                            <IconButton
                                className="expand-filters"
                                onTouchTap={this._toggleExtendedFilters}
                                tooltip={this.getTranslation("extended_filters")}
                                style={filterButtonColor}
                            >
                                <FilterListIcon color={filterIconColor} />
                            </IconButton>

                            {isFiltering &&
                                <IconButton
                                    onTouchTap={this._clearFilters}
                                    tooltip={this.getTranslation("clear_filters")}
                                >
                                    <ClearIcon />
                                </IconButton>
                            }
                        </div>

                        <AnimateHeight
                            duration={400}
                            height={showExtendedFilters ? 'auto' : 0}
                            style={showExtendedFilters ? styles.animationVisible : styles.animationHidden}
                        >
                            <Paper zDepth={1} rounded={false} style={{ paddingLeft: 20,height: 160, marginTop: 40 }}>
                                <div className="control-row">
                                    <div className="user-management-control select-role">
                                        <MultipleFilter
                                            title={this.getTranslation('filter_role')}
                                            options={this.state.userRoles || []}
                                            selected={this.state.filterByRoles}
                                            onChange={this.setFilterRoles}
                                            styles={styles.filterStyles}
                                        />
                                    </div>

                                    <div className="user-management-control select-group">
                                        <MultipleFilter
                                            title={this.getTranslation('filter_group')}
                                            options={this.state.userGroups || []}
                                            selected={this.state.filterByGroups}
                                            onChange={this.setFilterGroups}
                                            styles={styles.filterStyles}
                                        />
                                    </div>
                                </div>

                                <div className="control-row">
                                    <div className="user-management-control select-organisation-unit">
                                        <OrgUnitsFilter
                                            title={this.getTranslation('filter_by_organisation_units')}
                                            selected={this.state.filterByOrgUnits}
                                            onChange={this.setFilterOrgUnits}
                                            styles={styles.filterStyles}
                                        />
                                    </div>

                                    <div className="user-management-control select-organisation-unit-output">
                                        <OrgUnitsFilter
                                            title={this.getTranslation('filter_by_organisation_units_output')}
                                            selected={this.state.filterByOrgUnitsOutput}
                                            onChange={this.setFilterOrgUnitsOutput}
                                            styles={styles.filterStyles}
                                        />
                                    </div>
                                </div>
                                </Paper>
                            
                        </AnimateHeight>
                    </div>

                    <div className="user-management-control pagination">
                        <Pagination {...paginationProps} />

                        <ImportExport
                            d2={d2}
                            columns={settings.getVisibleTableColumns()}
                            filterOptions={listFilterOptions}
                            onImport={this._openImportTable}
                            maxUsers={this.maxImportUsers}
                        />
                    </div>
                </div>

                <LoadingStatus
                    loadingText={['Loading', this.props.params.modelType, 'list...'].join(' ')}
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
                        {this.state.dataRows.length || this.state.isLoading ? null : <div>No results found</div>}
                    </div>
                    {
                        this.state.detailsObject ?
                            <DetailsBoxWithScroll
                                style={styles.detailsBoxWrap}
                                detailsObject={this.state.detailsObject}
                                onClose={listActions.hideDetailsBox}
                            />
                        : null}
                </div>

                {this.state.orgunitassignment.open ? <OrgUnitDialog
                     models={this.state.orgunitassignment.users}
                     open={true}
                     onRequestClose={this._closeOrgUnitDialog}
                     title={this.state.orgunitassignment.title}
                     field={this.state.orgunitassignment.field}
                     roots={this.state.orgunitassignment.roots}
                     onOrgUnitAssignmentSaved={this._orgUnitAssignmentSaved}
                     onOrgUnitAssignmentError={this._orgUnitAssignmentError}
                 /> : null }

                {assignUserRoles.open ?
                    <UserRolesDialog
                        users={assignUserRoles.users}
                        onRequestClose={() => userRolesAssignmentDialogStore.setState({open: false})}
                    />
                    : null}

                {assignUserGroups.open ?
                    <UserGroupsDialog
                        users={assignUserGroups.users}
                        onRequestClose={() => userGroupsAssignmentDialogStore.setState({open: false})}
                    />
                    : null}

                {layoutSettingsVisible &&
                    <TableLayout
                        options={allColumns}
                        selected={settings.getVisibleTableColumns()}
                        onChange={this._setLayoutSettings}
                        onSave={this._saveLayoutSettings}
                        onClose={this._closeLayoutSettings}
                    />
                }

                {replicateUser.open ? this.getReplicateDialog(replicateUser) : null}

                {!importUsers.open ? null :
                    <ImportTable
                        title={this.getTranslation("import")}
                        onSave={this._importUsers}
                        onRequestClose={this._closeImportUsers}
                        actionText={this.getTranslation('import')}
                        users={importUsers.users}
                        columns={importUsers.columns}
                        warnings={importUsers.warnings}
                        maxUsers={this.maxImportUsers}
                    />
                }
            </div>
        );
    },

    _closeOrgUnitDialog() {
        orgUnitDialogStore.setState(Object.assign({}, orgUnitDialogStore.state, {
            open: false,
        }));
    },

});

List.contextTypes = {
    d2: PropTypes.object.isRequired,
};


export default List;
