import React, { Component } from 'react';
import log from 'loglevel';
import isIterable from 'd2-utilizr/lib/isIterable';
import DataTable from '../data-table/DataTable.component';
import MultipleDataTable from '../components/multiple-data-table/MultipleDataTable.component';
import Pagination from 'd2-ui/lib/pagination/Pagination.component';
import DetailsBox from './DetailsBox.component';
import contextActions from './context.actions';
import detailsStore from './details.store';
import listStore from './list.store';
import listActions from './list.actions';
import ObserverRegistry from '../utils/ObserverRegistry.mixin';
import Paper from 'material-ui/Paper/Paper';
import Translate from 'd2-ui/lib/i18n/Translate.mixin';
import SearchBox from './SearchBox.component';
import LoadingStatus from './LoadingStatus.component';
import camelCaseToUnderscores from 'd2-utilizr/lib/camelCaseToUnderscores';
import Auth from 'd2-ui/lib/auth/Auth.mixin';
import orgUnitDialogStore from './organisation-unit-dialog/organisationUnitDialogStore';
import userRolesAssignmentDialogStore from './userRoles.store';
import OrgUnitDialog from './organisation-unit-dialog/OrgUnitDialog.component';
import UserRolesDialog from '../components/user-roles-dialog/UserRolesDialog.component';
import snackActions from '../Snackbar/snack.actions';
import Heading from 'd2-ui/lib/headings/Heading.component';
import Checkbox from 'material-ui/Checkbox/Checkbox';
import { Observable } from 'rx';
import PropTypes from 'prop-types';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

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
    const pageSize = 50; // TODO: Make the page size dynamic
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

    getInitialState() {
        return {
            dataRows: null,
            pager: {
                total: 0,
            },
            isLoading: true,
            detailsObject: null,
            searchString: "",
            filterByRole: null,
            filterByGroup: null,
            sorting: initialSorting,
            showAllUsers: true,
            sharing: {
                model: null,
                open: false,
            },
            translation: {
                model: null,
                open: false,
            },
            orgunitassignment: {
                model: null,
                roots: [],
                open: false,
            },
            assignUserRoles: {
                users: null,
                open: false,
            },
        };
    },

    getDataTableRows(users) {
        const namesFromCollection = collection =>
            _(collection && collection.toArray ? collection.toArray() : (collection || []))
                .map(obj => obj.displayName).sortBy().join(", ") || "-";
        return users.map(user => ({
            id: user.id,
            name: user.name,
            username: user.username,
            lastUpdated: user.lastUpdated,
            userGroups: namesFromCollection(user.userGroups),
            organisationUnits: namesFromCollection(user.organisationUnits),
            dataViewOrganisationUnits: namesFromCollection(user.dataViewOrganisationUnits),
            userRoles: namesFromCollection(user.userCredentials && user.userCredentials.userRoles),
            model: user,
        }));
    },

    componentWillMount() {
        const sourceStoreDisposable = listStore
            .subscribe(listStoreValue => {
                if (!isIterable(listStoreValue.list)) {
                    return; // Received value is not iterable, keep waiting
                }

                this.setState({
                    dataRows: listStoreValue.list,
                    pager: listStoreValue.pager,
                    tableColumns: listStoreValue.tableColumns,
                    isLoading: false,
                });
            });

        /** load select fields data */
        listActions.loadUserRoles.next();
        listActions.loadUserGroups.next();

        /** Set user roles list for filter by role */
        const rolesStoreDisposable = listStore.listRolesSubject.subscribe(userRoles => {
            this.setState({ userRoles: this.convertObjsToMenuItems(userRoles) });
        });

        /** Set user groups list for filter by group */
        const groupsStoreDisposable = listStore.listGroupsSubject.subscribe(userGroups => {
            this.setState({ userGroups: this.convertObjsToMenuItems(userGroups) });
        });

        const detailsStoreDisposable = detailsStore.subscribe(detailsObject => {
            this.setState({ detailsObject });
        });

        const orgUnitAssignmentStoreDisposable = orgUnitDialogStore.subscribe(orgunitassignmentState => {
            this.setState({
                orgunitassignment: orgunitassignmentState,
                detailsObject: null,
            }, () => !orgunitassignmentState.open && this.filterList({keepCurrentPage: true}));
        });

        const userRolesAssignmentDialogStoreDisposable = userRolesAssignmentDialogStore.subscribe(assignUserRoles => {
            this.setState({
                assignUserRoles,
                detailsObject: null,
            }, () => !assignUserRoles.open && this.filterList({keepCurrentPage: true}));
        });

        this.registerDisposable(sourceStoreDisposable);
        this.registerDisposable(detailsStoreDisposable);
        this.registerDisposable(orgUnitAssignmentStoreDisposable);
        this.registerDisposable(rolesStoreDisposable);
        this.registerDisposable(groupsStoreDisposable);
        this.registerDisposable(userRolesAssignmentDialogStoreDisposable);
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

    filterList({keepCurrentPage = false} = {}) {
        const order = this.state.sorting ?
            (this.state.sorting[0] + ":i" + this.state.sorting[1]) : null;
        listActions.filter({
            modelType: this.props.params.modelType,
            canManage: !this.state.showAllUsers,
            order: order,
            page: keepCurrentPage ? this.state.pager.page : 1,
            filters: _.pickBy({
                "displayName": this.state.searchString && ["ilike", this.state.searchString],
                "userCredentials.userRoles.id": this.state.filterByRole && ["eq", this.state.filterByRole],
                "userGroups.id": this.state.filterByGroup && ["eq", this.state.filterByGroup],
            }),
        }).subscribe(() => {}, error => log.error(error));
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
        this.setState({showAllUsers: !isChecked}, this.filterList);
    },

    setFilterRole(event, index, value) {
        this.setState({filterByRole: value}, this.filterList);
    },

    setFilterGroup(event, index, value) {
        this.setState({filterByGroup: value}, this.filterList);
    },

    convertObjsToMenuItems(objs) {
        const emptyEntry = <MenuItem key="_empty_item" value="" primaryText="" />;
        const entries = objs.toArray()
            .map(obj => <MenuItem key={obj.id} value={obj.id} primaryText={obj.displayName} />);
        return [emptyEntry].concat(entries);
    },

    render() {
        if (!this.state.dataRows)
            return null;
        const currentlyShown = calculatePageValue(this.state.pager);

        const paginationProps = {
            hasNextPage: () => Boolean(this.state.pager.hasNextPage) && this.state.pager.hasNextPage(),
            hasPreviousPage: () => Boolean(this.state.pager.hasPreviousPage) && this.state.pager.hasPreviousPage(),
            onNextPageClick: () => {
                this.setState({ isLoading: true });
                listActions.getNextPage();
            },
            onPreviousPageClick: () => {
                this.setState({ isLoading: true });
                listActions.getPreviousPage();
            },
            total: this.state.pager.total,
            currentlyShown,
        };

        const styles = {
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
            }
        };

        const rows = this.getDataTableRows(this.state.dataRows);
        const {assignUserRoles} = this.state;

        return (
            <div>
                <div>
                    <Heading>{this.getTranslation(`${camelCaseToUnderscores(this.props.params.modelType)}_management`)}</Heading>
                </div>
                <div className="user-management-controls">
                    <div className="user-management-control">
                        <SearchBox searchObserverHandler={this.searchListByName} />
                    </div>
                    <div className="user-management-control select-role">
                        <SelectField autoWidth floatingLabelText={this.getTranslation('filter_role')}
                                     value={this.state.filterByRole}
                                     onChange={this.setFilterRole}>
                            {this.state.userRoles}
                        </SelectField>
                    </div>
                    <div className="user-management-control select-group">
                        <SelectField autoWidth floatingLabelText={this.getTranslation('filter_group')}
                                     value={this.state.filterByGroup}
                                     onChange={this.setFilterGroup}>
                            {this.state.userGroups}
                        </SelectField>
                    </div>
                    <div className="user-management-control">
                        <Checkbox className="control-checkbox"
                                  label={this.getTranslation('display_only_users_can_manage')}
                                  onCheck={this._onCanManageClick}
                                  checked={!this.state.showAllUsers}
                        />
                    </div>
                    <div className="fill-space"></div>
                    <div className="user-management-control">
                        <Pagination {...paginationProps} />
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
                            columns={this.state.tableColumns}
                            contextActions={contextActions}
                            onColumnSort={this.onColumnSort}
                            isMultipleSelectionAllowed={true}
                            showSelectColumn={true}
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

                {this.state.orgunitassignment.model ? <OrgUnitDialog
                    model={this.state.orgunitassignment.model}
                    title={this.state.orgunitassignment.title}
                    field={this.state.orgunitassignment.field}
                    roots={this.state.orgunitassignment.roots}
                    open={this.state.orgunitassignment.open}
                    onOrgUnitAssignmentSaved={this._orgUnitAssignmentSaved}
                    onOrgUnitAssignmentError={this._orgUnitAssignmentError}
                    onRequestClose={this._closeOrgUnitDialog}
                /> : null}

                {assignUserRoles.open ?
                    <UserRolesDialog
                        users={assignUserRoles.users}
                        onRequestClose={() => userRolesAssignmentDialogStore.setState({open: false})}
                    />
                    : null}
            </div>
        );
    },

    _closeOrgUnitDialog() {
        orgUnitDialogStore.setState(Object.assign({}, orgUnitDialogStore.state, {
            open: false,
        }));
    },

});

export default List;
