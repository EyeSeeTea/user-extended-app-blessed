import React from 'react';
import PropTypes from 'prop-types';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';

import MultiSelect from '../components/MultiSelect.component';

class TableLayout extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
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
        closeButton: {
            marginRight: 16,
        },
    };

    close = () => {
        this.props.onClose();
    }

    onChange = (selected) => {
        this.props.onChange(selected);
    }

    getDialogButtons() {
        return [
            <FlatButton
                label={this.getTranslation('close')}
                onClick={this.close}
                style={this.styles.closeButton}
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
                    onRequestClose={this.close}
                >
                    <MultiSelect
                        options={options}
                        selected={selected}
                        onRequestClose={this.onClose}
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
};

TableLayout.contextTypes = {
    d2: React.PropTypes.any,
};

export default TableLayout;
