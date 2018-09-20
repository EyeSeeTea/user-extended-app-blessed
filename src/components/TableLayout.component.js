import React from 'react';
import PropTypes from 'prop-types';
import { Dialog, FlatButton, RaisedButton } from 'material-ui';

import MultiSelect from '../components/MultiSelect.component';
import snackActions from '../Snackbar/snack.actions';

class TableLayout extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.initialSelected = props.selected;
    }

    styles = {
        wrapper: {
            width: 'inherit',
            position: 'relative',
        },
        dialog: {
            minWidth: '40%',
        },
        body: {
            marginBottom: 15,
        },
        cancelButton: {
            marginRight: 16,
        },
    };

    cancel = () => {
        this.onChange(this.initialSelected);
        this.props.onClose();
    }

    onChange = (selected) => {
        this.props.onChange(selected);
    }

    save = () => {
        const { selected } = this.props;
        
        if (_(selected).isEmpty()) {
            snackActions.show({ message: this.getTranslation('table_layout_at_least_one_column') });
        } else {
            this.props.onSave();
        }
    }

    getDialogButtons() {
        return [
            <FlatButton
                label={this.getTranslation('cancel')}
                onClick={this.cancel}
                style={this.styles.cancelButton}
            />,
            <RaisedButton
                primary={true}
                label={this.getTranslation('save')}
                onClick={this.save}
            />
        ];
    }

    render() {
        const { options, selected } = this.props;
        const title = this.getTranslation("layout_settings");
        
        return (
            <div style={this.styles.wrapper}>
                <Dialog
                    title={title}
                    actions={this.getDialogButtons()}
                    autoScrollBodyContent={true}
                    autoDetectWindowHeight={true}
                    contentStyle={this.styles.dialog}
                    open={true}
                    bodyStyle={this.styles.body}
                    onRequestClose={this.cancel}
                >
                    <MultiSelect
                        height={230}
                        options={options}
                        selected={selected}
                        onRequestClose={this.cancel}
                        onChange={this.onChange}
                        sortable={true}
                    />
                </Dialog>
            </div>
        );
    }
}

TableLayout.propTypes = {
    selected: PropTypes.arrayOf(PropTypes.string).isRequired,
    options: PropTypes.arrayOf(PropTypes.object).isRequired,
    onChange: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
};

TableLayout.contextTypes = {
    d2: React.PropTypes.any,
};

export default TableLayout;
