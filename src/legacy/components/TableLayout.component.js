import _ from "lodash";
import PropTypes from "prop-types";
import React from "react";
import MultiSelect from "./MultiSelect.component";
import snackActions from "../Snackbar/snack.actions";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";

class TableLayout extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.initialSelected = props.selected;
    }

    styles = {
        wrapper: {
            width: "inherit",
            position: "relative",
        },
        dialog: {
            minWidth: "40%",
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
    };

    onChange = selected => {
        this.props.onChange(selected);
    };

    save = () => {
        const { selected } = this.props;

        if (_(selected).isEmpty()) {
            snackActions.show({ message: this.getTranslation("table_layout_at_least_one_column") });
        } else {
            this.props.onSave();
        }
    };

    render() {
        const { options, selected } = this.props;
        const title = this.getTranslation("layout_settings");

        return (
            <div style={this.styles.wrapper}>
                <ConfirmationDialog
                    open={true}
                    title={title}
                    maxWidth={"lg"}
                    fullWidth={true}
                    onCancel={this.cancel}
                    cancelText={this.getTranslation("cancel")}
                    onSave={this.save}
                    saveText={this.getTranslation("save")}
                >
                    <MultiSelect
                        height={240}
                        options={options}
                        selected={selected}
                        onRequestClose={this.cancel}
                        onChange={this.onChange}
                        sortable={true}
                    />
                </ConfirmationDialog>
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
    d2: PropTypes.any,
};

export default TableLayout;
