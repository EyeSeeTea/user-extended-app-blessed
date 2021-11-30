import React from "react";
import LoadingMask from "d2-ui/lib/loading-mask/LoadingMask.component";
import TextField from "material-ui/TextField/TextField";
import Action from "d2-ui/lib/action/Action";
import { Observable } from "rxjs/Rx";
import OrgUnitTree from "d2-ui/lib/org-unit-tree/OrgUnitTree.component";
import OrgUnitSelectByLevel from "d2-ui/lib/org-unit-select/OrgUnitSelectByLevel.component";
import OrgUnitSelectByGroup from "d2-ui/lib/org-unit-select/OrgUnitSelectByGroup.component";
import OrgUnitSelectAll from "d2-ui/lib/org-unit-select/OrgUnitSelectAll.component";
import PropTypes from "prop-types";
import _ from "lodash";
import { listWithInFilter } from "../utils/dhis2Helpers";

class OrgUnitForm extends React.Component {
    constructor(props, context) {
        super(props, context);

        this.state = {
            searchValue: "",
            originalRoots: this.props.roots,
            rootOrgUnits: this.props.roots,
            filteringByNameLabel: this.props.filteringByNameLabel,
            orgUnitsSelectedLabel: this.props.orgUnitsSelectedLabel,
            groups: [],
            levels: [],
            loading: false,
        };

        this._searchOrganisationUnits = Action.create("searchOrganisationUnits");
        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.toggleOrgUnit = this.toggleOrgUnit.bind(this);
        this.onChange = this.onChange.bind(this);
    }

    componentWillMount = () => {
        const d2 = this.context.d2;

        Promise.all([
            d2.models.organisationUnitLevels.list({
                paging: false,
                fields: "id,level,displayName,shortName,path",
                order: "level:asc",
            }),
            d2.models.organisationUnitGroups.list({
                paging: false,
                fields: "id,displayName,shortName,path",
            }),
        ]).then(([levels, groups]) => {
            this.setState({
                groups,
                levels,
            });
        });

        this.disposable = this._searchOrganisationUnits
            .map(action => action.data)
            .debounceTime(400)
            .distinctUntilChanged()
            .map(searchValue => {
                if (!searchValue.trim()) {
                    return Observable.of(this.state.originalRoots);
                } else {
                    const organisationUnitRequest = this.context.d2.models.organisationUnits
                        .filter()
                        .on("displayName")
                        .ilike(searchValue)
                        .list({
                            fields: "id,displayName,shortName,path,children::isNotEmpty",
                            withinUserHierarchy: true,
                        })
                        .then(modelCollection => modelCollection.toArray());
                    return Observable.fromPromise(organisationUnitRequest);
                }
            })
            .concatAll()
            .subscribe(orgUnits => {
                this.setState({ rootOrgUnits: orgUnits });
            });
    };

    componentWillUnmount = () => {
        this.disposable && this.disposable.unsubscribe();
    };

    async onChange(orgUnitsPaths) {
        const { d2 } = this.context;
        const orgUnitIds = orgUnitsPaths.map(path => _.last(path.split("/")));
        const newSelected = await listWithInFilter(d2.models.organisationUnits, "id", orgUnitIds, {
            paging: false,
            fields: "id,displayName,shortName,path",
        });

        this.props.onChange(newSelected);
    }

    toggleOrgUnit(ev, orgUnitModel) {
        const orgUnit = _(orgUnitModel).pick(["id", "shortName", "path", "displayName"]).value();
        const newSelected = _(this.props.selected).find(selectedOu => selectedOu.path === orgUnit.path)
            ? this.props.selected.filter(selectedOu => selectedOu.path !== orgUnit.path)
            : this.props.selected.concat([orgUnit]);
        this.props.onChange(newSelected);
    }

    renderRoots = () => {
        const selectedPaths = this.props.selected.map(ou => ou.path);

        if (this.state.rootOrgUnits.length) {
            return (
                <div style={{ maxHeight: 350, maxWidth: 480, overflow: "auto" }}>
                    {this.state.rootOrgUnits.map(rootOu => (
                        <OrgUnitTree
                            key={rootOu.id}
                            selected={selectedPaths}
                            root={rootOu}
                            onSelectClick={this.toggleOrgUnit}
                            emitModel
                            initiallyExpanded={[rootOu.path]}
                        />
                    ))}
                </div>
            );
        }

        return <div>{this.context.d2.i18n.getTranslation("no_roots_found")}</div>;
    };

    render() {
        if (!this.state.rootOrgUnits) {
            //eslint-disable-next-line
            return <div>this.context.d2.i18n.getTranslation('determining_your_root_orgunits')</div>;
        }

        const { intersectionPolicy, filteringByNameLabel, orgUnitsSelectedLabel } = this.props;
        const styles = {
            wrapper: {
                position: "relative",
                height: 450,
                minHeight: 450,
                maxHeight: 450,
                minWidth: 800,
            },
            loadingMask: {
                position: "fixed",
                top: 54,
                right: 22,
                width: 480,
                height: 250,
                background: "rgba(255,255,255,0.6)",
                zIndex: 5,
            },
            controls: {
                float: "right",
                width: 575,
                zIndex: 1,
                background: "white",
            },
        };

        const selectedPaths = this.props.selected.map(ou => ou.path);

        return (
            <div style={styles.wrapper}>
                {this.state.loading ? (
                    <div style={styles.loadingMask}>
                        <LoadingMask />
                    </div>
                ) : undefined}

                <TextField
                    onChange={event => this._searchOrganisationUnits(event.target.value)}
                    floatingLabelText={filteringByNameLabel}
                    fullWidth
                />

                <div style={styles.controls}>
                    <OrgUnitSelectByGroup
                        groups={this.state.groups}
                        selected={selectedPaths}
                        intersectionPolicy={intersectionPolicy}
                        onUpdateSelection={this.onChange}
                    />
                    <OrgUnitSelectByLevel
                        levels={this.state.levels}
                        selected={selectedPaths}
                        intersectionPolicy={intersectionPolicy}
                        onUpdateSelection={this.onChange}
                    />
                    <div style={{ marginTop: 16 }}>
                        <OrgUnitSelectAll selected={selectedPaths} onUpdateSelection={this.onChange} />
                    </div>
                </div>
                <div className="organisation-unit-tree__selected">
                    {`${this.props.selected.length} ${orgUnitsSelectedLabel}`}
                </div>
                {this.renderRoots()}
            </div>
        );
    }
}

OrgUnitForm.propTypes = {
    onChange: PropTypes.func.isRequired,
    roots: PropTypes.arrayOf(PropTypes.object).isRequired,
    selected: PropTypes.arrayOf(PropTypes.object).isRequired,
    intersectionPolicy: PropTypes.bool,
    filteringByNameLabel: PropTypes.string,
    orgUnitsSelectedLabel: PropTypes.string,
};

OrgUnitForm.defaultProps = {
    intersectionPolicy: false,
};

OrgUnitForm.contextTypes = {
    d2: PropTypes.any,
};

export default OrgUnitForm;
