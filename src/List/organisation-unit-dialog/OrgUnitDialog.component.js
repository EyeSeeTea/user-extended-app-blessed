import React from 'react';
import Dialog from 'material-ui/Dialog/Dialog';
import FlatButton from 'material-ui/FlatButton/FlatButton';
import RaisedButton from 'material-ui/RaisedButton/RaisedButton';
import Toggle from 'material-ui/Toggle/Toggle';
import BatchModelsMultiSelectModel from '../../components/batch-models-multi-select/BatchModelsMultiSelect.model';
import { getOwnedPropertyJSON } from 'd2/lib/model/helpers/json';
import PropTypes from 'prop-types';
import _m from '../../utils/lodash-mixins';
import OrgUnitForm from '../../components/OrgUnitForm';

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
            selected: selected.map(ou => ou.path),
            updateStrategy: props.models.length > 1 ? "merge" : "replace",
        };

        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.save = this.save.bind(this);
        this.onChange = this.onChange.bind(this);
    }

    getCommonOrgUnits(objects, orgUnitField) {
        return _.intersectionBy(...objects.map(obj => obj[orgUnitField].toArray()), "id");
    }

    _renderStrategyToggle() {
        const {models} = this.props;
        const {updateStrategy} = this.state;

        if (models && models.length > 1) {
            const label = this.getTranslation('update_strategy') + ": " +
                this.getTranslation('update_strategy_' + updateStrategy);

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

    onChange(selected) {
        this.setState({ selected });
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

    render() {
        const {root, title, models} = this.props;
        const styles = {
            dialog: {
                minWidth: 875, maxWidth: '100%',
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

                <OrgUnitForm
                    onRequestClose={this.props.onRequestClose}
                    onChange={this.onChange}
                    roots={this.props.roots}
                    selected={this.state.selected}
                    intersectionPolicy={false}
                />
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
