import React from 'react';
import PropTypes from 'prop-types';
import TextField from 'material-ui/TextField';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import RaisedButton from 'material-ui/RaisedButton/RaisedButton';
import OrgUnitForm from './OrgUnitForm';
import _ from 'lodash';

import FilteredMultiSelect from '../components/FilteredMultiSelect.component';

class MultipleSelector extends React.Component {
    constructor(props, context) {
        super(props, context);

        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.dialogButtons = this.getDialogButtons();

        this.state = {
            selected: props.selected,
        };
    }

    styles = {
        wrapper: {
            width: 'inherit',
            position: 'relative',
        },
        dialog: {
            minWidth: 875,
            maxWidth: '100%',
        },
        cancelButton: {
            marginRight: 16,
        },
    };

    onChange = (selected) => {
        this.setState({ selected });
    }

    onOrgUnitsChange = (selectedPaths) => {
        const selected = selectedPaths.map(path => _.last(path.split("/")));
        this.setState({ selected });
    }

    applyAndClose = () => {
        const { field, onChange, data, options } = this.props;
        const { selected } = this.state;

        onChange(selected, field, data);
    }

    closeDialog = () => {
        this.props.onClose();
    }

    getDialogButtons() {
        return [
            <FlatButton
                label={this.getTranslation('close')}
                onClick={this.closeDialog}
                style={this.styles.cancelButton}
            />,
            <RaisedButton
                primary
                label={this.getTranslation('apply')}
                onClick={this.applyAndClose}
            />,
        ];
    }

    titleByField = {
        userGroups: "assignGroups",
        userRoles: "assignRoles",
        organisationUnits: "assignToOrgUnits",
        dataViewOrganisationUnits: "assignToOrgUnitsOutput",
    }

    renderForm() {
        const { field, options, orgUnitRoots } = this.props;
        const { selected } = this.state;

        const selectOptions = options.map(o => ({value: o.id, text: o.displayName}));

        switch (field) {
        case "userGroups":
        case "userRoles":
            return (
                <FilteredMultiSelect
                    options={selectOptions}
                    selected={selected}
                    onRequestClose={this.closeDialog}
                    onChange={this.onChange}
                />
            );
        case "organisationUnits":
        case "dataViewOrganisationUnits":
            const selectedPaths = _(options).keyBy("id").at(selected).compact().map("path").value();

            return (
                <OrgUnitForm
                    onRequestClose={this.closeDialog}
                    onChange={this.onOrgUnitsChange}
                    roots={orgUnitRoots}
                    selected={selectedPaths}
                    intersectionPolicy={false}
                />
            );
        default:
            throw new Error(`[MultipleSelector] Unknown field: ${field}`)
        }
    }

    render() {
        const { field } = this.props;
        const title = this.getTranslation(this.titleByField[field]);
        
        return (
            <Dialog
                title={title}
                actions={this.dialogButtons}
                autoScrollBodyContent={true}
                autoDetectWindowHeight={true}
                contentStyle={this.styles.dialog}
                open={true}
                onRequestClose={this.closeDialog}
            >
                {this.renderForm()}
            </Dialog>
        );
    }
}

MultipleSelector.propTypes = {
    field: PropTypes.string.isRequired,
    selected: PropTypes.arrayOf(PropTypes.string).isRequired,
    options: PropTypes.arrayOf(PropTypes.object).isRequired,
    onClose: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    orgUnitRoots: PropTypes.arrayOf(PropTypes.object).isRequired,
};

MultipleSelector.contextTypes = {
    d2: React.PropTypes.any,
};

export default MultipleSelector;
