import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import { getOwnedPropertyJSON } from "d2/lib/model/helpers/json";
import _ from "lodash";
import Toggle from "material-ui/Toggle/Toggle";
import PropTypes from "prop-types";
import React from "react";
import BatchModelsMultiSelectModel from "../../components/batch-models-multi-select/BatchModelsMultiSelect.model";
import OrgUnitForm from "../../components/OrgUnitForm";
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
        const selected = this.getCommonOrgUnits(props.models, props.field);

        this.state = {
            selected: selected,
            updateStrategy: props.models.length > 1 ? "merge" : "replace",
        };

        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.save = this.save.bind(this);
        this.onChange = this.onChange.bind(this);
    }

    getCommonOrgUnits(objects, orgUnitField) {
        return _.intersectionBy(...objects.map(obj => obj[orgUnitField].toArray()), "id");
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

    save = () => {
        const { selected } = this.state;

        this.setState({ loading: true });
        this.model
            .save(
                this.props.models,
                selected,
                selected.map(ou => ou.id),
                this.state.updateStrategy
            )
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
    };

    render = () => {
        const { title, filteringByNameLabel, orgUnitsSelectedLabel } = this.props;

        return (
            <ConfirmationDialog
                open={true}
                title={title}
                maxWidth={"lg"}
                fullWidth={true}
                onCancel={this.props.onRequestClose}
                onSave={this.save}
                disabled={this.state.loading}
            >
                {this._renderStrategyToggle()}

                <OrgUnitForm
                    onRequestClose={this.props.onRequestClose}
                    onChange={this.onChange}
                    roots={this.props.roots}
                    selected={this.state.selected}
                    intersectionPolicy={true}
                    filteringByNameLabel={filteringByNameLabel}
                    orgUnitsSelectedLabel={orgUnitsSelectedLabel}
                />
            </ConfirmationDialog>
        );
    };
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
