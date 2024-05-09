import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import _ from "lodash";
import Checkbox from "material-ui/Checkbox/Checkbox";
import IconButton from "material-ui/IconButton";
import { Switch, Grid } from "@material-ui/core";
import FilterListIcon from "material-ui/svg-icons/content/filter-list";
import memoize from "memoize-weak";
import PropTypes from "prop-types";
import React from "react";
import MultipleFilter from "../components/MultipleFilter.component";
import OrgUnitsSelectorFilter from "../components/OrgUnitsSelectorFilter";
import listActions from "./list.actions";
import listStore from "./list.store";

export default class Filters extends React.Component {
    static contextTypes = {
        d2: PropTypes.object.isRequired,
    };

    static propTypes = {
        onChange: PropTypes.func.isRequired,
    };

    styles = {
        wrapper: {
            flex: "unset",
        },
        paper: {
            paddingLeft: 20,
            paddingBottom: 2,
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
        clearFiltersButton: {
            marginRight: 25,
            marginLeft: "auto",
        },
    };

    constructor(props, context) {
        super(props);

        const { i18n } = context.d2;

        this.getTranslation = i18n.getTranslation.bind(i18n);
        this.setFilter = memoize(this._setFilter);

        this.state = {
            showExtendedFilters: false,
            searchString: "",
            searchStringClear: null,
            showOnlyManagedUsers: false,
            showOnlyActiveUsers: false,
            userRoles: [],
            userGroups: [],
            orgUnits: [],
            orgUnitsOutput: [],
            searchOrgUnits: [],
            userRolesAll: [],
            userGroupsAll: [],
            rootJunction: "OR",
        };
    }

    componentWillMount = () => {
        this.observerDisposables = [];
    };

    componentWillUnmount = () => {
        this.observerDisposables.forEach(disposable => disposable.dispose?.());
    };

    registerDisposable = disposable => {
        this.observerDisposables.push(disposable);
    };

    componentDidMount = () => {
        listActions.loadUserRoles.next();
        listActions.loadUserGroups.next();
        const toOptions = objs => objs.toArray().map(obj => ({ value: obj.id, text: obj.displayName }));

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
    };

    openFilters = () => {
        this.setState({ showExtendedFilters: true });
    };

    closeFilters = () => {
        this.setState({ showExtendedFilters: false });
    };

    searchListByName = searchObserver => {
        this.registerDisposable(
            searchObserver.subscribe(value => this.setState({ searchString: value }, this.notifyParent))
        );
    };

    getFilterOptions = () => {
        const {
            showOnlyManagedUsers,
            showOnlyActiveUsers,
            searchString,
            userRoles,
            userGroups,
            orgUnits,
            orgUnitsOutput,
            searchOrgUnits,
            rootJunction,
        } = this.state;

        const inFilter = field => (_(field).isEmpty() ? null : ["in", field]);

        return {
            ...(showOnlyManagedUsers ? { canManage: "true" } : {}),
            ...(searchString ? { query: searchString } : {}),
            ...(rootJunction ? { rootJunction } : {}),
            filters: {
                "userCredentials.disabled": showOnlyActiveUsers ? ["eq", false] : undefined,
                "userCredentials.userRoles.id": inFilter(userRoles),
                "userGroups.id": inFilter(userGroups),
                "organisationUnits.id": inFilter(orgUnits.map(ou => ou.id)),
                "dataViewOrganisationUnits.id": inFilter(orgUnitsOutput.map(ou => ou.id)),
                "searchOrganisationUnits.id": inFilter(searchOrgUnits.map(ou => ou.id)),
            },
        };
    };

    clearFilters = () => {
        this.setState(
            {
                showOnlyManagedUsers: false,
                showOnlyActiveUsers: false,
                searchStringClear: new Date(),
                userGroups: [],
                userRoles: [],
                orgUnits: [],
                orgUnitsOutput: [],
                searchOrgUnits: [],
            },
            this.notifyParent
        );
    };

    notifyParent = () => {
        const filterOptions = this.getFilterOptions();
        this.props.onChange(filterOptions);
    };

    _setFilter = (key, getter) => {
        return (...args) => {
            const newValue = getter ? getter(...args) : args[0];
            this.setState({ [key]: newValue }, this.notifyParent);
        };
    };

    checkboxHandler = (ev, isChecked) => isChecked;

    render() {
        const {
            userGroups,
            userRoles,
            orgUnits,
            orgUnitsOutput,
            searchOrgUnits,
            showOnlyManagedUsers,
            showOnlyActiveUsers,
            showExtendedFilters,
            rootJunction,
        } = this.state;

        const { styles } = this;

        const isExtendedFiltering =
            showOnlyManagedUsers ||
            showOnlyActiveUsers ||
            !_([userGroups, userRoles, orgUnits, orgUnitsOutput, searchOrgUnits]).every(_.isEmpty);
        const isFiltering = showOnlyManagedUsers || isExtendedFiltering;
        const filterIconColor = isExtendedFiltering ? "#ff9800" : undefined;
        const filterButtonColor = showExtendedFilters ? { backgroundColor: "#cdcdcd" } : undefined;

        return (
            <div className="user-management-controls" style={styles.wrapper}>
                <div className="user-management-control search-box">
                    <IconButton
                        className="expand-filters"
                        onClick={this.openFilters}
                        tooltip={this.getTranslation("extended_filters")}
                        style={filterButtonColor}
                    >
                        <FilterListIcon color={filterIconColor} />
                    </IconButton>
                </div>

                <ConfirmationDialog
                    title={this.getTranslation("extended_filters")}
                    maxWidth={"lg"}
                    fullWidth={true}
                    open={showExtendedFilters}
                    onCancel={this.closeFilters}
                    cancelText={this.getTranslation("close")}
                    infoActionText={this.getTranslation("clear_filters")}
                    onInfoAction={isFiltering ? this.clearFilters : undefined}
                >
                    <div style={{ padding: 10, margin: 10 }}>
                        <Grid container spacing={2} className="control-row">
                            <Grid item xs={8} className="control-row checkboxes">
                                <Checkbox
                                    className="control-checkbox"
                                    label={this.getTranslation("display_only_users_can_manage")}
                                    onCheck={this.setFilter("showOnlyManagedUsers", this.checkboxHandler)}
                                    checked={showOnlyManagedUsers}
                                />
                                <Checkbox
                                    className="control-checkbox"
                                    label={this.getTranslation("display_only_enabled_users")}
                                    onCheck={this.setFilter("showOnlyActiveUsers", this.checkboxHandler)}
                                    checked={showOnlyActiveUsers}
                                />
                            </Grid>
                            <Grid item xs={4} className="control-row switch">
                                <span>{this.getTranslation("Filtering_behavior")}</span>
                                <div className="control-switch">
                                    <span>{this.getTranslation("OR")}</span>
                                    <Switch
                                        className="control-switch"
                                        onChange={() => {
                                            const newRootJunction = rootJunction === "AND" ? "OR" : "AND";
                                            this.setState({ rootJunction: newRootJunction }, this.notifyParent);
                                        }}
                                        checked={rootJunction === "AND"}
                                    />
                                    <span>{this.getTranslation("AND")}</span>
                                </div>
                                <span>{this.getTranslation("Active_in_advanced_only")}</span>
                            </Grid>
                        </Grid>
                        <div className="control-row">
                            <div className="user-management-control select-role">
                                <MultipleFilter
                                    title={this.getTranslation("filter_role")}
                                    options={this.state.userRolesAll}
                                    selected={this.state.userRoles}
                                    onChange={this.setFilter("userRoles")}
                                    styles={styles.filterStyles}
                                />
                            </div>

                            <div className="user-management-control select-group">
                                <MultipleFilter
                                    title={this.getTranslation("filter_group")}
                                    options={this.state.userGroupsAll}
                                    selected={this.state.userGroups}
                                    onChange={this.setFilter("userGroups")}
                                    styles={styles.filterStyles}
                                />
                            </div>
                        </div>

                        <div className="control-row">
                            <div className="user-management-control select-organisation-unit">
                                <OrgUnitsSelectorFilter
                                    api={this.props.api}
                                    title={this.getTranslation("filter_by_organisation_units_capture")}
                                    selected={this.state.orgUnits}
                                    onChange={this.setFilter("orgUnits")}
                                    styles={styles.filterStyles}
                                />
                            </div>

                            <div className="user-management-control select-organisation-unit-output">
                                <OrgUnitsSelectorFilter
                                    api={this.props.api}
                                    title={this.getTranslation("filter_by_organisation_units_output")}
                                    selected={this.state.orgUnitsOutput}
                                    onChange={this.setFilter("orgUnitsOutput")}
                                    styles={styles.filterStyles}
                                />
                            </div>

                            <div className="user-management-control select-search-organisation-unit">
                                <OrgUnitsSelectorFilter
                                    api={this.props.api}
                                    title={this.getTranslation("filter_by_search_organisation_units")}
                                    selected={this.state.searchOrgUnits}
                                    onChange={this.setFilter("searchOrgUnits")}
                                    styles={styles.filterStyles}
                                />
                            </div>
                        </div>
                    </div>
                </ConfirmationDialog>
            </div>
        );
    }
}
