import React from 'react';
import Checkbox from 'material-ui/Checkbox/Checkbox';
import PropTypes from 'prop-types';
import IconButton from 'material-ui/IconButton';
import FilterListIcon from 'material-ui/svg-icons/content/filter-list';
import ClearIcon from 'material-ui/svg-icons/content/clear';
import AnimateHeight from 'react-animate-height';
import Paper from 'material-ui/Paper/Paper';
import memoize from 'memoize-weak';

import SearchBox from './SearchBox.component';
import OrgUnitsFilter from '../components/OrgUnitsFilter.component';
import MultipleFilter from '../components/MultipleFilter.component';
import ObserverRegistry from '../utils/ObserverRegistry.mixin';
import listActions from './list.actions';
import listStore from './list.store';

export default class Filters extends React.Component {
    static contextTypes = {
        d2: PropTypes.object.isRequired,
    }

    static propTypes = {
        onChange: PropTypes.func.isRequired,
    }

    styles = {
        wrapper: {
            flex: 'unset',
        },
        paper: {
            paddingLeft: 20,
            height: 160,
            marginTop: 40,
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
    }

    constructor(props, context) {
        super(props);

        Object.assign(this, ObserverRegistry);

        const { i18n } = context.d2;

        this.getTranslation = i18n.getTranslation.bind(i18n);
        this.setFilter = memoize(this._setFilter);

        this.state = {
            showExtendedFilters: false,
            searchString: "",
            searchStringClear: null,
            showOnlyManagedUsers: false,
            userRoles: [],
            userGroups: [],
            orgUnits: [],
            orgUnitsOutput: [],
            userRolesAll: [],
            userGroupsAll: [],
        };
    }

    componentDidMount() {
        listActions.loadUserRoles.next();
        listActions.loadUserGroups.next();
        const toOptions = objs => objs.toArray().map(obj => ({value: obj.id, text: obj.displayName}));

        this.registerDisposable(
            listStore.listRolesSubject.subscribe(userRoles => {
                this.setState({ userRolesAll: toOptions(userRoles) });
            })
        );

        this.registerDisposable(
            listStore.listGroupsSubject.subscribe(userGroups => {
                this.setState({ userGroupsAll: toOptions(userGroups) });
            })
        );
    }

    toggleExtendedFilters = () => {
        this.setState({showExtendedFilters: !this.state.showExtendedFilters});
    }

    searchListByName = (searchObserver) => {
        this.registerDisposable(
            searchObserver.subscribe(value => this.setState({ searchString: value }, this.notifyParent))
        );
    }

    getFilterOptions() {
        const {
            showOnlyManagedUsers,
            searchString,
            userRoles,
            userGroups,
            orgUnits,
            orgUnitsOutput,
        } = this.state;

        const inFilter = (field) => _(field).isEmpty() ? null : ["in", field];

        return {
            canManage: showOnlyManagedUsers,
            query: searchString,
            filters: {
                "userCredentials.userRoles.id": inFilter(userRoles),
                "userGroups.id": inFilter(userGroups),
                "organisationUnits.id": inFilter(orgUnits.map(ou => ou.id)),
                "dataViewOrganisationUnits.id": inFilter(orgUnitsOutput.map(ou => ou.id)),
            },
        };
    }

    clearFilters = () => {
        this.setState({
            showOnlyManagedUsers: false,
            searchStringClear: new Date(),
            userGroups: [],
            userRoles: [],
            orgUnits: [],
            orgUnitsOutput: [],
        }, this.notifyParent);
    }

    notifyParent() {
        const filterOptions = this.getFilterOptions();
        this.props.onChange(filterOptions);
    }

    _setFilter = (key, getter) => {
        return (...args) => {
            const newValue = getter ? getter(...args) : args[0];
            this.setState({ [key]: newValue }, this.notifyParent);
        };
    }

    render() {
        const { onChange } = this.props;
        const {
            userGroups,
            userRoles,
            orgUnits,
            orgUnitsOutput,
            showOnlyManagedUsers,
            searchString,
            searchStringClear,
            showExtendedFilters,
        } = this.state;
        const { styles } = this;

        const isExtendedFiltering = !_([
            userGroups,
            userRoles,
            orgUnits,
            orgUnitsOutput,
        ]).every(_.isEmpty)
        const isFiltering = showOnlyManagedUsers || searchString || isExtendedFiltering;
        const filterIconColor = isExtendedFiltering ? "#ff9800" : undefined;
        const filterButtonColor = showExtendedFilters ? {backgroundColor: '#cdcdcd'} : undefined;

        return (
            <div className="user-management-controls" style={styles.wrapper}>
                <div className="user-management-control search-box">
                    <SearchBox clear={searchStringClear} searchObserverHandler={this.searchListByName} />

                    <Checkbox
                        className="control-checkbox"
                        label={this.getTranslation('display_only_users_can_manage')}
                        onCheck={this.setFilter("showOnlyManagedUsers", (ev, isChecked) => isChecked)}
                        checked={showOnlyManagedUsers}
                    />

                    <IconButton
                        className="expand-filters"
                        onTouchTap={this.toggleExtendedFilters}
                        tooltip={this.getTranslation("extended_filters")}
                        style={filterButtonColor}
                    >
                        <FilterListIcon color={filterIconColor} />
                    </IconButton>

                    {isFiltering &&
                        <IconButton
                            onTouchTap={this.clearFilters}
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
                    <Paper zDepth={1} rounded={false} style={styles.paper}>
                        <div className="control-row">
                            <div className="user-management-control select-role">
                                <MultipleFilter
                                    title={this.getTranslation('filter_role')}
                                    options={this.state.userRolesAll}
                                    selected={this.state.userRoles}
                                    onChange={this.setFilter("userRoles")}
                                    styles={styles.filterStyles}
                                />
                            </div>

                            <div className="user-management-control select-group">
                                <MultipleFilter
                                    title={this.getTranslation('filter_group')}
                                    options={this.state.userGroupsAll}
                                    selected={this.state.userGroups}
                                    onChange={this.setFilter("userGroups")}
                                    styles={styles.filterStyles}
                                />
                            </div>
                        </div>

                        <div className="control-row">
                            <div className="user-management-control select-organisation-unit">
                                <OrgUnitsFilter
                                    title={this.getTranslation('filter_by_organisation_units')}
                                    selected={this.state.orgUnits}
                                    onChange={this.setFilter("orgUnits")}
                                    styles={styles.filterStyles}
                                />
                            </div>

                            <div className="user-management-control select-organisation-unit-output">
                                <OrgUnitsFilter
                                    title={this.getTranslation('filter_by_organisation_units_output')}
                                    selected={this.state.orgUnitsOutput}
                                    onChange={this.setFilter("orgUnitsOutput")}
                                    styles={styles.filterStyles}
                                />
                            </div>
                        </div>
                    </Paper>
                </AnimateHeight>
            </div>
        );
    }
}
