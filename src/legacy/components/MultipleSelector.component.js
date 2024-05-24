import { ConfirmationDialog, OrgUnitsSelector } from "@eyeseetea/d2-ui-components";
import React from "react";
import PropTypes from "prop-types";
/* We need the Observable import to avoid the error
rxjs__WEBPACK_IMPORTED_MODULE_1__.Observable.fromPromise is not a function
due to d2-ui library using this module
*/
// eslint-disable-next-line
import { Observable } from "rxjs/Rx";
import _ from "lodash";

import FilteredMultiSelect from "./FilteredMultiSelect.component";

import { extractIdsFromPaths, orgUnitControls, orgUnitListParams } from "../../utils/d2-api";
import { listWithInFilter } from "../utils/dhis2Helpers";

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

    onOrgUnitsChange = async paths => {
        const ids = extractIdsFromPaths(paths);
        const selected = await listWithInFilter(this.context.d2.models.organisationUnits, "id", ids, {
            paging: false,
            fields: "id,displayName,shortName,path",
        });
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
        searchOrganisationsUnits: "assign_to_org_units_search",
    };

    renderForm = () => {
        const { field, options } = this.props;
        const { selected } = this.state;

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
                    <OrgUnitsSelector
                        api={this.props.api}
                        selected={selected.map(ou => ou.path)}
                        onChange={this.onOrgUnitsChange}
                        controls={orgUnitControls}
                        listParams={orgUnitListParams}
                        showNameSetting
                    />
                );
            case "dataViewOrganisationUnits":
                return (
                    <OrgUnitsSelector
                        api={this.props.api}
                        selected={selected.map(ou => ou.path)}
                        onChange={this.onOrgUnitsChange}
                        controls={orgUnitControls}
                        listParams={orgUnitListParams}
                        showNameSetting
                    />
                );
            case "searchOrganisationsUnits":
                return (
                    <OrgUnitsSelector
                        api={this.props.api}
                        selected={selected.map(ou => ou.path)}
                        onChange={this.onOrgUnitsChange}
                        controls={orgUnitControls}
                        listParams={orgUnitListParams}
                        showNameSetting
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
    api: PropTypes.any,
};

MultipleSelector.defaultProps = {
    options: [],
};

MultipleSelector.contextTypes = {
    d2: PropTypes.any,
};

export default MultipleSelector;
