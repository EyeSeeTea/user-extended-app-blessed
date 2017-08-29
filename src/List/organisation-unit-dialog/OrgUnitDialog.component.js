import React from 'react';

import isEqual from 'lodash.isequal';

import Dialog from 'material-ui/Dialog/Dialog';
import FlatButton from 'material-ui/FlatButton/FlatButton';
import RaisedButton from 'material-ui/RaisedButton/RaisedButton';

import LoadingMask from 'd2-ui/lib/loading-mask/LoadingMask.component';
import TextField from 'material-ui/TextField/TextField';
import Action from 'd2-ui/lib/action/Action';
import { Observable } from 'rxjs/Rx';
import OrgUnitTree from 'd2-ui/lib/org-unit-tree/OrgUnitTree.component';
import OrgUnitSelectByLevel from 'd2-ui/lib/org-unit-select/OrgUnitSelectByLevel.component';
import OrgUnitSelectByGroup from 'd2-ui/lib/org-unit-select/OrgUnitSelectByGroup.component';
import OrgUnitSelectAll from 'd2-ui/lib/org-unit-select/OrgUnitSelectAll.component';

import snackbarActions from '../../Snackbar/snack.actions';
import PropTypes from 'prop-types';

class OrgUnitDialog extends React.Component {
    constructor(props, context) {
        super(props, context);

        this.state = {
            searchValue: '',
            originalRoots: this.props.roots,
            rootOrgUnits: this.props.roots,
            selected: this.props.model.organisationUnits.toArray().map(i => i.path),
            groups: [],
            levels: [],
            loading: false,
        };

        this._searchOrganisationUnits = Action.create('searchOrganisationUnits');
        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.toggleOrgUnit = this.toggleOrgUnit.bind(this);
        this.setNewSelection = this.setNewSelection.bind(this);
        this.save = this.save.bind(this);
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
                    levels });
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
        this.disposable && this.disposable.dispose();
    }

    componentWillReceiveProps(props) {
        if (props.model) {
            this.setState({
                originalRoots: props.roots,
                rootOrgUnits: props.roots,
                selected: props.model.organisationUnits.toArray().map(i => i.path),
            });
        }
    }
    
    setNewSelection(selected) {
        const d2 = this.context.d2;
        const modelOrgUnits = this.props.model.organisationUnits;
        const assigned = modelOrgUnits.toArray().map(ou => ou.path);

        const additions = selected
        // Filter out already assigned ids
            .filter(path => assigned.indexOf(path) === -1)
            // Add the rest
            .map(path => d2.models.organisationUnits.create({ id: _.last(path.split("/")), path }));

        const deletions = assigned
        // Filter out ids that should be left in
            .filter(path => selected.indexOf(path) === -1)
            // Add the rest
            .map(path => d2.models.organisationUnits.create({ id: _.last(path.split("/")), path }));

        additions.forEach(ou => {
            modelOrgUnits.add(ou);
        });
        deletions.forEach(ou => {
            modelOrgUnits.remove(ou);
        });

        this.setState({ selected });
    }

    toggleOrgUnit(e, orgUnit) {
        if (this.state.selected.indexOf(orgUnit.path) === -1) {
            this.props.model.organisationUnits.add(orgUnit);
            this.setState(state => ({
                selected: state.selected.concat(orgUnit.path),
            }));
        } else {
            this.props.model.organisationUnits.remove(orgUnit);
            this.setState(state => ({
                selected: state.selected.filter(x => x !== orgUnit.path),
            }));
        }
    }

    save() {
        // d2-ui@27.x.y sends user.userCredentials[id], to which a 2.25 server responds
        // <400 - BadRequest - Missing required property username>. 
        // Solution: Clear user.userCredentials
        this.props.model.userCredentials = undefined;

        // On a model save, the property userGroups is not sent on the request because the flag
        // owner is set to false (see d2/helpers/json.js, getOwnedPropertyJSON). That's ok, the
        // problem is that the server, not receiving this field, clears all the user groups
        // for that user. It looks like a bug on the 2.25 API (it works on 2.26)
        // Simple (if hacky) solution: set the owner flag so the field is sent.
        this.props.model.modelDefinition.modelValidations.userGroups.owner = true;

        // Use same organisation units for <Data output and analysis organisation units>
        const {model} = this.props;
        const getIds = (collection) => collection.toArray().map(obj => obj.id);
        if (!isEqual(getIds(model.organisationUnits), getIds(model.dataViewOrganisationUnits))) {
            model.dataViewOrganisationUnits = model.organisationUnits;
        }

        if (this.props.model.isDirty()) {
            this.setState({ loading: true });
            this.props.model
                .save()
                .then(() => {
                    this.setState({ loading: false });
                    this.props.onOrgUnitAssignmentSaved();
                    this.props.onRequestClose();
                })
                .catch(err => {
                    this.setState({ loading: false });
                    this.props.onOrgUnitAssignmentError(err);
                    this.props.onRequestClose();
                });
        } else {
            snackbarActions.show({ message: this.getTranslation('no_changes_to_be_saved'), action: 'ok' });
            this.props.onRequestClose();
        }
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
                
        const {
            root,
        } = { ...this.props };

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

        const user = this.props.model;
        const username = user.userCredentials ? user.userCredentials.username : '-';
        const title = `${user.displayName} (${username}) ${this.getTranslation('org_unit_assignment')}`

        return (
            <Dialog
                title={title}
                actions={dialogActions}
                autoScrollBodyContent
                autoDetectWindowHeight
                contentStyle={styles.dialog}
                {...this.props}
            >
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
    model: PropTypes.object.isRequired,
    onOrgUnitAssignmentSaved: PropTypes.func.isRequired,
    onOrgUnitAssignmentError: PropTypes.func.isRequired,
};
OrgUnitDialog.contextTypes = {
    d2: PropTypes.any,
};

export default OrgUnitDialog;

