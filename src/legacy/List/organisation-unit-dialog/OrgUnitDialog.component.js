import { ConfirmationDialog, OrgUnitsSelector } from "@eyeseetea/d2-ui-components";
import { getOwnedPropertyJSON } from "d2/lib/model/helpers/json";
import _ from "lodash";
import Toggle from "material-ui/Toggle/Toggle";
import PropTypes from "prop-types";
import React from "react";
import { extractIdsFromPaths } from "../../../utils/d2-api";
import BatchModelsMultiSelectModel from "../../components/batch-models-multi-select/BatchModelsMultiSelect.model";
import { listWithInFilter } from "../../utils/dhis2Helpers";
import _m from "../../utils/lodash-mixins";

class OrgUnitDialog extends React.Component {
    constructor(props, context) {
        super(props, context);

        const modelOptions = {
            parentModel: this.context.d2.models.users,
            childrenModel: this.context.d2.models.organisationUnits,
            getChildren: user => user[props.field],
            getPayload: (_allOrgUnits, pairs) => ({
                users: pairs.map(([user, orgUnitsForUser]) =>
                    _m(getOwnedPropertyJSON(user))
                        .imerge({
                            // getOwnedPropertyJSON returns only the id for user.userCredentials,
                            // and dhis2 >= 2.32 needs the full object.
                            userCredentials: user.userCredentials,
                            [props.field]: orgUnitsForUser.map(ou => ({ id: ou.id })),
                        })
                        .value()
                ),
            }),
        };
        this.model = new BatchModelsMultiSelectModel(this.context.d2, modelOptions);

        this.state = {
            selected: this.getCommonOrgUnits(props.models, props.field),
            updateStrategy: props.models.length > 1 ? "merge" : "replace",
        };

        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.save = this.save.bind(this);
        this.onChange = this.onChange.bind(this);
    }

    getCommonOrgUnits(objects, orgUnitField) {
        return _.intersectionBy(...objects.map(obj => obj[orgUnitField].toArray()), "id").map(ou => ou.path);
    }

    _renderStrategyToggle = () => {
        const { models } = this.props;
        const { updateStrategy } = this.state;

        if (models && models.length > 1) {
            const label =
                this.getTranslation("update_strategy") +
                ": " +
                this.getTranslation("update_strategy_" + updateStrategy);

            return (
                <Toggle
                    label={label}
                    checked={updateStrategy === "replace"}
                    onToggle={(ev, newValue) => this.setState({ updateStrategy: newValue ? "replace" : "merge" })}
                    style={{
                        width: 300,
                        float: "right",
                        marginTop: 20,
                        marginRight: 15,
                        marginBottom: -50,
                    }}
                />
            );
        } else {
            return null;
        }
    };

    onChange(selected) {
        this.setState({ selected });
    }

    async save() {
        const orgUnitIds = extractIdsFromPaths(this.state.selected);
        const selectedOus = await listWithInFilter(this.context.d2.models.organisationUnits, "id", orgUnitIds, {
            paging: false,
            fields: "id,displayName,shortName,path",
        });

        this.setState({ loading: true });
        this.model
            .save(this.props.models, selectedOus, orgUnitIds, this.state.updateStrategy)
            .then(() => {
                this.setState({ loading: false });
                this.props.onOrgUnitAssignmentSaved();
                this.props.onRequestClose();
            })
            .catch(err => {
                this.setState({ loading: false });
                this.props.onOrgUnitAssignmentError(err);
                this.props.onRequestClose();
            });
    }

    render() {
        return (
            <ConfirmationDialog
                open={true}
                title={this.props.title}
                maxWidth={"lg"}
                fullWidth={true}
                onCancel={this.props.onRequestClose}
                onSave={this.save}
                disabled={this.state.loading}
            >
                {this._renderStrategyToggle()}

                <OrgUnitsSelector
                    api={this.props.api}
                    selected={this.state.selected}
                    onChange={this.onChange}
                    controls={{
                        filterByLevel: true,
                        filterByGroup: true,
                        filterByProgram: false,
                        selectAll: false,
                    }}
                    showNameSetting={true}
                />
            </ConfirmationDialog>
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
    filteringByNameLabel: PropTypes.string.isRequired,
    orgUnitsSelectedLabel: PropTypes.string.isRequired,
};

OrgUnitDialog.contextTypes = {
    d2: PropTypes.any,
};

export default OrgUnitDialog;
