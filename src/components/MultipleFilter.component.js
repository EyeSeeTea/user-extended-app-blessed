import React from 'react';
import PropTypes from 'prop-types';
import TextField from 'material-ui/TextField';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import RaisedButton from 'material-ui/RaisedButton/RaisedButton';

import FilteredMultiSelect from '../components/FilteredMultiSelect.component';

class MultipleFilter extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.openDialog = this.openDialog.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.onChange = this.onChange.bind(this);
        this.applyAndClose = this.applyAndClose.bind(this);
        this.fieldValue = this.getCompactFieldValue(props.options, props.selected);
        this.state = {
            dialogOpen: false,
            selected: props.selected,
        };
    }

    styles = {
        dialog: {
            minWidth: 875,
            maxWidth: '100%',
        },
        cancelButton: {
            marginRight: 16,
        },
    };

    componentWillReceiveProps(newProps) {
        if (newProps.options !== this.props.options || newProps.selected !== this.props.selected)
            this.fieldValue = this.getCompactFieldValue(newProps.options, newProps.selected);
    }

    openDialog() {
        this.setState({ dialogOpen: true, selected: this.props.selected });
    }

    closeDialog() {
        this.setState({ dialogOpen: false });
    }

    onChange(selected) {
        this.setState({ selected });
    }

    applyAndClose() {
        this.props.onChange(this.state.selected);
        this.closeDialog();
    }

    getDialogButtons() {
        return [
            <FlatButton
                label={this.getTranslation('cancel')}
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

    getCompactFieldValue(options, selected, limit = 1) {
        const names = _(options).keyBy("value").at(selected).map("text").value();

        if (names.length <= limit) {
            return names.join(', ');
        } else {
            return this.getTranslation("this_and_n_others_compact", {
                "this": _(names).take(limit).join(", "),
                "n": names.length - limit,
            });
        }
    }

    render() {
        const { title, options } = this.props;
        const { dialogOpen, selected } = this.state;
        
        return (
            <div style={{ width: 'inherit', position: 'relative' }}>
                <Dialog
                    title={title}
                    actions={this.getDialogButtons()}
                    autoScrollBodyContent={true}
                    autoDetectWindowHeight={true}
                    contentStyle={this.styles.dialog}
                    open={dialogOpen}
                    onRequestClose={this.closeDialog}
                >
                    <FilteredMultiSelect
                        options={options}
                        selected={selected}
                        onRequestClose={this.closeDialog}
                        onChange={this.onChange}
                    />
                </Dialog>

                <TextField
                    value={this.fieldValue}
                    onClick={this.openDialog}
                    onChange={this.openDialog}
                    floatingLabelText={title}
                    inputStyle={{ cursor: 'pointer' }}
                />
            </div>
        );
    }
}

MultipleFilter.propTypes = {
    title: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.object).isRequired,
    onChange: PropTypes.func.isRequired,
    selected: PropTypes.arrayOf(PropTypes.string).isRequired,
};

MultipleFilter.contextTypes = {
    d2: React.PropTypes.any,
};

export default MultipleFilter;
