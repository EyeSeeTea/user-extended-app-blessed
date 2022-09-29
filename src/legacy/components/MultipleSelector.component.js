import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import React from "react";
import PropTypes from "prop-types";
import OrgUnitForm from "./OrgUnitForm";
import _ from "lodash";

import FilteredMultiSelect from "./FilteredMultiSelect.component";

class MultipleSelector extends React.Component {
    constructor(props, context) {
        super(props, context);

        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);

        this.state = {
            selected: props.selected,
        };
    }

    styles = {
        wrapper: {
            width: "inherit",
            position: "relative",
        },
        dialog: {
            minWidth: 875,
            maxWidth: "100%",
        },
        cancelButton: {
            marginRight: 16,
        },
    };

    onMultiSelectChange = selectedIds => {
        const { options } = this.props;
        const selected = _(options).keyBy("id").at(selectedIds).compact().value();
        this.setState({ selected });
    };

    onOrgUnitsChange = selected => {
        this.setState({ selected });
    };

    applyAndClose = () => {
        const { field, onChange, data } = this.props;
        const { selected } = this.state;

        onChange(selected, field, data);
    };

    closeDialog = () => {
        this.props.onClose();
    };

    titleByField = {
        userGroups: "assign_groups",
        userRoles: "assign_roles",
        organisationUnits: "assign_to_org_units_capture",
        dataViewOrganisationUnits: "assign_to_org_units_output",
    };

    renderForm = () => {
        const { field, options, orgUnitRoots } = this.props;
        const { selected } = this.state;
        const t = this.getTranslation.bind(this);

        switch (field) {
            case "userGroups":
            case "userRoles": {
                const selectOptions = options.map(o => ({ value: o.id, text: o.displayName }));
                const selectedIds = _(selected).map("id").value();

                return (
                    <FilteredMultiSelect
                        options={selectOptions}
                        selected={selectedIds}
                        onRequestClose={this.closeDialog}
                        onChange={this.onMultiSelectChange}
                    />
                );
            }
            case "organisationUnits":
                return (
                    <OrgUnitForm
                        onRequestClose={this.closeDialog}
                        onChange={this.onOrgUnitsChange}
                        roots={orgUnitRoots}
                        selected={selected}
                        intersectionPolicy={false}
                        filteringByNameLabel={t("filter_organisation_units_capture_by_name")}
                        orgUnitsSelectedLabel={t("organisation_units_capture_selected")}
                    />
                );
            case "dataViewOrganisationUnits":
                return (
                    <OrgUnitForm
                        onRequestClose={this.closeDialog}
                        onChange={this.onOrgUnitsChange}
                        roots={orgUnitRoots}
                        selected={selected}
                        intersectionPolicy={false}
                        filteringByNameLabel={t("filter_organisation_units_output_by_name")}
                        orgUnitsSelectedLabel={t("organisation_units_output_selected")}
                    />
                );
            default:
                throw new Error(`[MultipleSelector] Unknown field: ${field}`);
        }
    };

    render() {
        const { field } = this.props;
        const title = this.getTranslation(this.titleByField[field]);

        return (
            <ConfirmationDialog
                open={true}
                title={title}
                maxWidth={"lg"}
                fullWidth={true}
                cancelText={this.getTranslation("close")}
                onCancel={this.closeDialog}
                saveText={this.getTranslation("apply")}
                onSave={this.applyAndClose}
            >
                {this.renderForm()}
            </ConfirmationDialog>
        );
    }
}

MultipleSelector.propTypes = {
    field: PropTypes.string.isRequired,
    selected: PropTypes.arrayOf(PropTypes.object).isRequired,
    options: PropTypes.arrayOf(PropTypes.object),
    onClose: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    orgUnitRoots: PropTypes.arrayOf(PropTypes.object).isRequired,
};

MultipleSelector.defaultProps = {
    options: [],
};

MultipleSelector.contextTypes = {
    d2: PropTypes.any,
};

export default MultipleSelector;
