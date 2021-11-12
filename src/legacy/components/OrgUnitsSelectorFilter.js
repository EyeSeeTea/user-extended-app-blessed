import _ from "lodash";
import TextField from "material-ui/TextField";
import PropTypes from "prop-types";
import React from "react";
import { ConfirmationDialog, OrgUnitsSelector } from "@eyeseetea/d2-ui-components";
import { listWithInFilter } from "../utils/dhis2Helpers";

class OrgUnitsSelectorFilter extends React.Component {
    constructor(props, context) {
        super(props, context);

        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.openDialog = this.openDialog.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.onChange = this.onChange.bind(this);
        this.applyAndClose = this.applyAndClose.bind(this);
        this.fieldValue = this.getCompactFieldValue(props.selected);
        this.state = {
            dialogOpen: false,
            selected: props.selected,
        };
    }

    styles = {
        dialog: {
            minWidth: 875,
            maxWidth: "100%",
        },
        cancelButton: {
            marginRight: 16,
        },
        wrapper: {
            width: "inherit",
            position: "relative",
        },
        inputStyle: {
            cursor: "pointer",
        },
    };

    componentWillReceiveProps(newProps) {
        if (newProps.selected !== this.props.selected) this.fieldValue = this.getCompactFieldValue(newProps.selected);
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

    getOuPaths() {
        return this.state.selected.map(ouOrPath =>
            typeof ouOrPath === "object" && "path" in ouOrPath ? ouOrPath.path : ouOrPath
        );
    }

    async applyAndClose() {
        const { d2 } = this.context;
        const orgUnitIds = this.getOuPaths().map(path => _.last(path.split("/")));
        const newSelected = await listWithInFilter(d2.models.organisationUnits, "id", orgUnitIds, {
            paging: false,
            fields: "id,displayName,shortName,path",
        });

        this.props.onChange(newSelected);
        this.closeDialog();
    }

    getCompactFieldValue(selected, { limit = 3 } = {}) {
        const names = selected.map(ou => ou.displayName);

        if (names.length <= limit) {
            return names.join(", ");
        } else {
            return this.getTranslation("this_and_n_others_compact", {
                this: _(names).take(limit).join(", "),
                n: names.length - limit,
            });
        }
    }

    render() {
        const { title, styles } = this.props;
        const { dialogOpen } = this.state;
        const t = this.getTranslation.bind(this);

        return (
            <div style={this.styles.wrapper}>
                <ConfirmationDialog
                    title={title}
                    open={dialogOpen}
                    maxWidth={"lg"}
                    fullWidth={true}
                    onCancel={this.closeDialog}
                    cancelText={t("cancel")}
                    onSave={this.applyAndClose}
                    saveText={t("apply")}
                >
                    <OrgUnitsSelector
                        api={this.props.api}
                        selected={this.getOuPaths()}
                        onChange={this.onChange}
                        controls={{
                            filterByLevel: true,
                            filterByGroup: true,
                            filterByProgram: false,
                            selectAll: false,
                        }}
                    />
                </ConfirmationDialog>

                <TextField
                    value={this.fieldValue}
                    onClick={this.openDialog}
                    onChange={this.openDialog}
                    floatingLabelText={title}
                    style={styles.textField}
                    inputStyle={this.styles.inputStyle}
                />
            </div>
        );
    }
}

OrgUnitsSelectorFilter.propTypes = {
    title: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    selected: PropTypes.arrayOf(PropTypes.object).isRequired,
    styles: PropTypes.object,
    api: PropTypes.object,
};

OrgUnitsSelectorFilter.contextTypes = {
    d2: PropTypes.any,
};

export default OrgUnitsSelectorFilter;
