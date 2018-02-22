import React from 'react';
import isEqual from 'lodash.isequal';
import Dialog from 'material-ui/Dialog/Dialog';
import FlatButton from 'material-ui/FlatButton/FlatButton';
import RaisedButton from 'material-ui/RaisedButton/RaisedButton';
import Toggle from 'material-ui/Toggle/Toggle';
import LoadingMask from 'd2-ui/lib/loading-mask/LoadingMask.component';
import TextField from 'material-ui/TextField/TextField';
import Action from 'd2-ui/lib/action/Action';
import { Observable } from 'rxjs/Rx';
import OrgUnitTree from 'd2-ui/lib/org-unit-tree/OrgUnitTree.component';
import OrgUnitSelectByLevel from 'd2-ui/lib/org-unit-select/OrgUnitSelectByLevel.component';
import OrgUnitSelectByGroup from 'd2-ui/lib/org-unit-select/OrgUnitSelectByGroup.component';
import OrgUnitSelectAll from 'd2-ui/lib/org-unit-select/OrgUnitSelectAll.component';
import BatchModelsMultiSelectModel from '../../components/batch-models-multi-select/BatchModelsMultiSelect.model';
import { getOwnedPropertyJSON } from 'd2/lib/model/helpers/json';
import snackbarActions from '../../Snackbar/snack.actions';
import PropTypes from 'prop-types';
import _m from '../../utils/lodash-mixins';

class OrgUnitDialog extends React.Component {
    constructor(props, context) {
        super(props, context);

        const modelOptions = {
            parentModel: d2.models.users,
            childrenModel: d2.models.organisationUnits,
            getChildren: user => user[props.field],
            getPayload: (allOrgUnits, pairs) => ({
                users: pairs.map(([user, orgUnitsForUser]) =>
                    _m(getOwnedPropertyJSON(user))
                        .omit("userCredentials")
                        .imerge({[props.field]: orgUnitsForUser.map(ou => ({id: ou.id}))})
                        .value()
                ),
            }),
        };
        this.model = new BatchModelsMultiSelectModel(this.context.d2, modelOptions);
        const selected = this.getCommonOrgUnits(props.models, props.field);

        this.state = {
            searchValue: '',
            originalRoots: this.props.roots,
            rootOrgUnits: this.props.roots,
            selected: selected.map(ou => ou.path),
            groups: [],
            levels: [],
            loading: false,
            updateStrategy: props.models.length > 1 ? "merge" : "replace",
        };

        this._searchOrganisationUnits = Action.create('searchOrganisationUnits');
        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.toggleOrgUnit = this.toggleOrgUnit.bind(this);
        this.setNewSelection = this.setNewSelection.bind(this);
        this.save = this.save.bind(this);
    }

    getCommonOrgUnits(objects, orgUnitField) {
        return _.intersectionBy(...objects.map(obj => obj[orgUnitField].toArray()), "id");
    }

    _renderStrategyToggle() {
        const {models} = this.props;
        const {updateStrategy} = this.state;

        if (models && models.length > 1) {
            const getTranslation = this.context.d2.i18n.getTranslation.bind(this.context.d2.i18n);
            const label = getTranslation('update_strategy') + ": " +
                getTranslation('update_strategy_' + updateStrategy);

            return (
                <Toggle
                    label={label}
                    checked={updateStrategy === "replace"}
                    onToggle={(ev, newValue) => this.setState({updateStrategy: newValue ? "replace" : "merge"})}
                    style={{width: 300, float: "right", marginTop: 20, marginRight: 15, marginBottom: -50}}
                />
            );
        } else {
            return null;
        }
    }

    componentWillMount() {
        const d2 = this.context.d2;

        Promise.all([
            d2.models.organisationUnitLevels.list({
                paging: false,
                fields: 'id,level,displayName,path',
                order: 'level:asc',
            }),
            d2.models.organisationUnitGroups.list({
                paging: false,
                fields: 'id,displayName,path',
            }),
        ])
            .then(([
                levels,
                groups,
            ]) => {
                this.setState({
                    groups,
                    levels
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
                        .filter().on('displayName').ilike(searchValue)
                        .list({ fields: 'id,displayName,path,children::isNotEmpty', withinUserHierarchy: true })
                        .then(modelCollection => modelCollection.toArray());
                    return Observable.fromPromise(organisationUnitRequest);
                }
            })
            .concatAll()
            .subscribe((orgUnits) => {
                this.setState({ rootOrgUnits: orgUnits });
            });
    }

    componentWillUnmount() {
        this.disposable && this.disposable.unsubscribe();
    }

    componentWillReceiveProps(props) {
        if (props.models) {
            const selected = this.getCommonOrgUnits(props.models, props.field);
            this.setState({
                originalRoots: props.roots,
                rootOrgUnits: props.roots,
                selected: selected.map(ou => ou.path),
            });
        }
    }

    setNewSelection(selected) {
        this.setState({ selected });
    }

    toggleOrgUnit(e, orgUnit) {
        if (this.state.selected.indexOf(orgUnit.path) === -1) {
            this.setState(state => ({
                selected: state.selected.concat(orgUnit.path),
            }));
        } else {
            this.setState(state => ({
                selected: state.selected.filter(x => x !== orgUnit.path),
            }));
        }
    }

    save() {
        const selected = this.state.selected.map(path => ({id: _.last(path.split("/"))}));

        this.setState({loading: true});
        this.model.save(this.props.models, selected, selected.map(ou => ou.id), this.state.updateStrategy)
            .then(() => {
                this.setState({loading: false});
                this.props.onOrgUnitAssignmentSaved();
                this.props.onRequestClose();
            })
            .catch(err => {
                this.setState({loading: false});
                this.props.onOrgUnitAssignmentError(err);
                this.props.onRequestClose();
            });
    }

    renderRoots() {
        if (this.state.rootOrgUnits.length) {
            return (
                <div style={{ maxHeight: 350, maxWidth: 480, overflow: 'auto' }}>
                    {this.state.rootOrgUnits.map(rootOu => (
                        <OrgUnitTree
                            key={rootOu.id}
                            selected={this.state.selected}
                            root={rootOu}
                            onSelectClick={this.toggleOrgUnit}
                            emitModel
                            initiallyExpanded={[rootOu.path]}
                        />
                    ))}
                </div>
            );
        }

        return (
            <div>{this.context.d2.i18n.getTranslation('no_roots_found')}</div>
        );
    }

    render() {
        if (!this.state.rootOrgUnits) {
            return (<div>this.context.d2.i18n.getTranslation('determining_your_root_orgunits')</div>);
        }

        const {root, title, models} = this.props;
        const styles = {
            dialog: {
                minWidth: 875, maxWidth: '100%',
            },
            wrapper: {
                position: 'relative',
                height: 450, minHeight: 450, maxHeight: 450,
                minWidth: 800,
            },
            loadingMask: {
                position: 'fixed',
                top: 54, right: 22,
                width: 480,
                height: 250,
                background: 'rgba(255,255,255,0.6)',
                zIndex: 5,
            },
            controls: {
                position: 'fixed',
                top: 156, right: 24,
                width: 475,
                zIndex: 1,
                background: 'white',
            },
            cancelButton: {
                marginRight: 16,
            },
        };

        const dialogActions = [
            <FlatButton
                label={this.getTranslation('cancel')}
                onClick={this.props.onRequestClose}
                style={styles.cancelButton}
                disabled={this.state.loading}
            />,
            <RaisedButton
                primary
                label={this.getTranslation('save')}
                onClick={this.save}
                disabled={this.state.loading}
            />,
        ];

        return (
            <Dialog
                title={title}
                actions={dialogActions}
                autoScrollBodyContent
                autoDetectWindowHeight
                contentStyle={styles.dialog}
                {...this.props}
            >
                {this._renderStrategyToggle()}

                <div style={styles.wrapper}>
                    {this.state.loading ? (
                        <div style={styles.loadingMask}>
                            <LoadingMask />
                        </div>
                    ) : undefined}

                    <TextField
                        onChange={(event) => this._searchOrganisationUnits(event.target.value)}
                        floatingLabelText={this.context.d2.i18n.getTranslation('filter_organisation_units_by_name')}
                        fullWidth
                    />
                    <div style={styles.controls}>
                        <OrgUnitSelectByGroup
                            groups={this.state.groups}
                            selected={this.state.selected}
                            intersectionPolicy={true}
                            onUpdateSelection={this.setNewSelection}
                        />
                        <OrgUnitSelectByLevel
                            levels={this.state.levels}
                            selected={this.state.selected}
                            intersectionPolicy={true}
                            onUpdateSelection={this.setNewSelection}
                        />
                        <div style={{ marginTop: 16 }}>
                            <OrgUnitSelectAll
                                selected={this.state.selected}
                                onUpdateSelection={this.setNewSelection}
                            />
                        </div>
                    </div>
                    <div className="organisation-unit-tree__selected">
                        {`${this.state.selected.length} ${this.getTranslation('organisation_units_selected')}`}
                    </div>
                    {this.renderRoots()}
                </div>
            </Dialog>
        );
    }
}

OrgUnitDialog.propTypes = {
    onRequestClose: PropTypes.func.isRequired,
    roots: PropTypes.arrayOf(PropTypes.object).isRequired,
    models: PropTypes.arrayOf(PropTypes.object).isRequired,
    field: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    onOrgUnitAssignmentSaved: PropTypes.func.isRequired,
    onOrgUnitAssignmentError: PropTypes.func.isRequired,
};

OrgUnitDialog.contextTypes = {
    d2: PropTypes.any,
};

export default OrgUnitDialog;
