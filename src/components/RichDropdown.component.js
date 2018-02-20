import React from 'react';
import SelectField from 'material-ui/SelectField/SelectField';
import TextField from 'material-ui/TextField';
import isString from 'd2-utilizr/lib/isString';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import MenuItem from 'material-ui/MenuItem/MenuItem';
import CheckBox from 'd2-ui/lib/form-fields/CheckBox.component';


class RichDropdown extends React.Component {
    constructor(props, context) {
        super(props, context);

        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);

        this._onChange = this._onChange.bind(this);
        this.openDialog = this.openDialog.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        const initialControls = _(this.props.controls).map(c => [c.name, c.value]).fromPairs().value();

        this.state = {
            value: (this.props.value !== undefined && this.props.value !== null) ? this.props.value : '',
            controls: initialControls,
            options: this.getOptions(this.props.options, this.props.isRequired),
            dialogOpen: false,
        };
    }

    componentWillReceiveProps(newProps) {
        const controls = _(newProps.controls).map(c => [c.name, c.value]).fromPairs().value();
        this.setState({
            controls: controls,
            options: this.getOptions(newProps.options, newProps.isRequired),
        });
    }

    getOptions(options, required = false) {
        let opts = options
            .map((option) => {
                return {
                    value: option.value,
                    text: option.text,
                };
            });

        return opts
            .map(option => {
                if (option.text && this.props.translateOptions) {
                    option.text = isString(option.text) ? this.getTranslation(option.text.toLowerCase()) : option.text;
                }
                return option;
            });
    }

    _onChange(event, index, value) {
        this.props.onChange({
            target: {
                value,
            }
        });
    }

    openDialog() {
        if (this.filterList)
            this.filterList.focus();
        this.setState({ dialogOpen: true, filterText: '' });
    }

    closeDialog() {
        this.setState({ dialogOpen: false });
    }

    getOptionText(value) {
        return value && this.state.options.length
            ? this.state.options.find(option => option.value === value).text
            : '';
    }

    renderDialogOption(value, label) {
        return (
            <div
            style={{ cursor: 'pointer', margin: 8 }}
            key={value}
            onClick={() => {
                this.props.onChange({ target: { value: value } });
                this.setState({ dialogOpen: false, value: value });
            }}
            ><a>{label}</a></div>
        );
    }

    render() {
        const {
            onFocus,
            onBlur,
            labelText,
            modelDefinition,
            models,
            referenceType,
            referenceProperty,
            isInteger,
            translateOptions,
            isRequired,
            options,
            filterOptions,
            model,
            fullWidth,
            translateLabel,
            ...other
        } = this.props;

        return (
            <div style={{ width: fullWidth ? '100%' : 'inherit', position: 'relative' }}>
                <Dialog
                    title={labelText}
                    open={this.state.dialogOpen}
                    onRequestClose={this.closeDialog}
                    autoScrollBodyContent
                    autoDetectWindowHeight
                    actions={[
                        <FlatButton onClick={this.closeDialog} label={this.getTranslation('cancel')} />
                    ]}
                >
                    {this.props.controls.map(control => 
                        <CheckBox
                            label={control.label}
                            checked={this.state.controls[control.name]}
                            key={control.name}
                            onChange={() => this.setState({controls: 
                                _.merge(this.state.controls, {[control.name]: !this.state.controls[control.name]})})}
                        />
                    )}
                    <TextField
                        ref={input => { input && input.focus(); }} 
                        floatingLabelText='Filter list'
                        onChange={(e, value) => { this.setState({ filterText: value }); }}
                        style={{ marginBottom: 5 }}
                    />
                    {!this.props.isRequired && this.renderDialogOption(null, this.getTranslation('no_value'))}
                    {this.props.filterOptions(this.state.options, this.state.controls)
                        .filter(o => !this.state.filterText || this.state.filterText
                            .trim().toLocaleLowerCase().split(' ').every(
                                f => o.text.toLocaleLowerCase().includes(f.toLocaleLowerCase())
                            )
                        )
                        .map(o => this.renderDialogOption(o.value, o.text))
                    }
                </Dialog>
                <TextField
                    {...other}
                    fullWidth={fullWidth}
                    value={this.getOptionText(this.state.value)}
                    onClick={this.openDialog}
                    onChange={this.openDialog}
                    floatingLabelText={labelText}
                    inputStyle={{ cursor: 'pointer' }}
                />
            </div>
        );
    }

    renderOptions() {
        const options = this.state.options
            .map((option, index) => (
                <MenuItem
                    primaryText={option.text}
                    key={index}
                    value={option.value}
                    label={option.text}
                />
            ));

        if (!this.props.isRequired) {
            // When the value is not required we add an item that sets the value to null
            // For this value we pass an empty label to not show the label no_value
            // when this option is selected.
            options.unshift([
                <MenuItem
                    primaryText={this.getTranslation('no_value')}
                    key="no_value"
                    value={null}
                    label=" "
                />
            ]);
        }

        return options;
    }
}

RichDropdown.propTypes = {
    defaultValue: React.PropTypes.oneOfType([
        React.PropTypes.string,
        React.PropTypes.number,
        React.PropTypes.bool,
    ]),
    onFocus: React.PropTypes.func,
    onBlur: React.PropTypes.func,
    options: React.PropTypes.array.isRequired,
    isRequired: React.PropTypes.bool,
    labelText: React.PropTypes.string.isRequired,
    translateOptions: React.PropTypes.bool,
    filterOptions: React.PropTypes.func,
    controls: React.PropTypes.array,
};
RichDropdown.defaultProps = {
    controls: [],
    filterOptions: (options, controls) => options,
};
RichDropdown.contextTypes = {
    d2: React.PropTypes.any,
};

export default RichDropdown;
