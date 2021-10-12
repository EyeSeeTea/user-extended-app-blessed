import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import _ from "lodash";
import Checkbox from "material-ui/Checkbox/Checkbox";
import IconButton from "material-ui/IconButton";
import ClearIcon from "material-ui/svg-icons/content/clear";
import FilterListIcon from "material-ui/svg-icons/content/filter-list";
import memoize from "memoize-weak";
import PropTypes from "prop-types";
import React from "react";
import MultipleFilter from "../components/MultipleFilter.component";
import OrgUnitsFilter from "../components/OrgUnitsFilter.component";
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
            userRolesAll: [],
            userGroupsAll: [],
        };
    }

    componentWillMount = () => {
        this.observerDisposables = [];
    };

    componentWillUnmount = () => {
        this.observerDisposables.forEach(disposable => disposable.dispose());
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
        } = this.state;

        const inFilter = field => (_(field).isEmpty() ? null : ["in", field]);

        return {
            ...(showOnlyManagedUsers ? { canManage: "true" } : {}),
            ...(searchString ? { query: searchString } : {}),
            filters: {
                "userCredentials.disabled": showOnlyActiveUsers ? ["eq", false] : undefined,
                "userCredentials.userRoles.id": inFilter(userRoles),
                "userGroups.id": inFilter(userGroups),
                "organisationUnits.id": inFilter(orgUnits.map(ou => ou.id)),
                "dataViewOrganisationUnits.id": inFilter(orgUnitsOutput.map(ou => ou.id)),
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

    render = () => {
        const {
            userGroups,
            userRoles,
            orgUnits,
            orgUnitsOutput,
            showOnlyManagedUsers,
            showOnlyActiveUsers,
            showExtendedFilters,
        } = this.state;

        const { styles } = this;

        const isExtendedFiltering =
            showOnlyManagedUsers ||
            showOnlyActiveUsers ||
            !_([userGroups, userRoles, orgUnits, orgUnitsOutput]).every(_.isEmpty);
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
                >
                    <div style={{ padding: 10, margin: 10 }}>
                        <div className="control-row checkboxes">
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

                            {isFiltering && (
                                <IconButton
                                    style={styles.clearFiltersButton}
                                    onClick={this.clearFilters}
                                    tooltip={this.getTranslation("clear_filters")}
                                >
                                    <ClearIcon />
                                </IconButton>
                            )}
                        </div>

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
                                <OrgUnitsFilter
                                    title={this.getTranslation("filter_by_organisation_units_capture")}
                                    selected={this.state.orgUnits}
                                    onChange={this.setFilter("orgUnits")}
                                    styles={styles.filterStyles}
                                />
                            </div>

                            <div className="user-management-control select-organisation-unit-output">
                                <OrgUnitsFilter
                                    title={this.getTranslation("filter_by_organisation_units_output")}
                                    selected={this.state.orgUnitsOutput}
                                    onChange={this.setFilter("orgUnitsOutput")}
                                    styles={styles.filterStyles}
                                />
                            </div>
                        </div>
                    </div>
                </ConfirmationDialog>
            </div>
        );
    };
}
