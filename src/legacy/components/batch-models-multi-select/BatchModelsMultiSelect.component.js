import LoadingMask from "d2-ui/lib/loading-mask/LoadingMask.component";
import _ from "lodash";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import TextField from "material-ui/TextField/TextField";
import Toggle from "material-ui/Toggle/Toggle";
import PropTypes from "prop-types";
import React from "react";
import snackActions from "../../Snackbar/snack.actions";
import MultiSelect from "../MultiSelect.component";

export default class BatchModelsMultiSelectComponent extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.state = {
            state: "loading",
            parents: null,
            allChildren: null,
            selectedIds: null,
            filterText: "",
            updateStrategy: this.props.parents.length > 1 ? "merge" : "replace",
        };
    }

    styles = {
        dialog: {
            minWidth: 875,
            maxWidth: "100%",
        },
        contents: {
            padding: 15,
            position: "relative",
            height: 450,
            minHeight: 450,
            maxHeight: 450,
            minWidth: 800,
        },
        loadingMask: {
            position: "fixed",
            top: 54,
            right: 22,
            width: 480,
            height: 250,
            background: "rgba(255,255,255,0.6)",
            zIndex: 5,
        },
        controls: {
            position: "fixed",
            top: 156,
            right: 24,
            width: 475,
            zIndex: 1,
            background: "white",
        },
        cancelButton: {
            marginRight: 16,
        },
    };

    componentDidMount = () => {
        const { parents, model } = this.props;
        return Promise.all([model.getAllChildren(), model.getParents(parents)])
            .then(([allChildren, parentsLoaded]) =>
                this.setState({
                    state: "ready",
                    parents: parentsLoaded,
                    allChildren,
                    selectedIds: this.props.model.getSelectedChildren(parentsLoaded).map(obj => obj.id),
                })
            )
            .catch(err => this.close(this.getTranslation("error_loading_data") + " :" + err.toString()));
    };

    close(snackMessage = null) {
        if (snackMessage) snackActions.show({ message: snackMessage });
        this.props.onCancel();
    }

    renderStrategyToggle = () => {
        if (this.state.parents && this.state.parents.length > 1) {
            const label =
                this.getTranslation("update_strategy") +
                ": " +
                this.getTranslation("update_strategy_" + this.state.updateStrategy);

            return (
                <Toggle
                    label={label}
                    style={{ width: 300, float: "right", marginTop: 20, marginRight: 15 }}
                    checked={this.state.updateStrategy === "replace"}
                    onToggle={(ev, newValue) => this.setState({ updateStrategy: newValue ? "replace" : "merge" })}
                />
            );
        } else {
            return null;
        }
    };

    save = () => {
        const { parents, allChildren, selectedIds, updateStrategy } = this.state;
        this.setState({ state: "loading" });
        this.props.model
            .save(parents, allChildren, selectedIds, updateStrategy)
            .then(() => this.close(this.props.onSuccess))
            .catch(() => this.close(this.props.onError));
    };

    onChange(selectedIds) {
        this.setState({ selectedIds });
    }

    onFilterTextChange(event) {
        this.setState({ filterText: event.target.value });
    }

    render() {
        const isLoading = this.state.state === "loading";
        const { parents, allChildren, filterText, selectedIds } = this.state;
        const title = this.props.getTitle(parents, allChildren);
        const options = _(allChildren || [])
            .sortBy("name")
            .map(obj => ({ value: obj.id, text: obj.name }))
            .value();

        switch (this.state.state) {
            case "loading":
                return <LoadingMask />;
            case "error":
                return <div style={this.styles.loadingMask}>{this.state.error}</div>;
            case "ready":
                return (
                    <ConfirmationDialog
                        title={title}
                        open={true}
                        maxWidth={"lg"}
                        fullWidth={true}
                        onCancel={this.props.onCancel}
                        cancelText={this.getTranslation("cancel")}
                        saveText={this.getTranslation("save")}
                        onSave={!isLoading ? this.save.bind(this) : undefined}
                    >
                        <TextField
                            style={{ marginLeft: 15, marginTop: 5, marginBottom: -15 }}
                            value={filterText}
                            onChange={this.onFilterTextChange.bind(this)}
                            type="search"
                            hintText={`${this.getTranslation("search_by_name")}`}
                        />

                        {this.renderStrategyToggle()}

                        <div style={this.styles.contents}>
                            <MultiSelect
                                isLoading={isLoading}
                                options={options}
                                onChange={this.onChange.bind(this)}
                                selected={selectedIds}
                                filterText={filterText}
                            />
                        </div>
                    </ConfirmationDialog>
                );
            default:
                throw new Error(`Unknown state: ${this.state.state}`);
        }
    }
}

BatchModelsMultiSelectComponent.propTypes = {
    model: PropTypes.object.isRequired,
    parents: PropTypes.arrayOf(PropTypes.string).isRequired,
    onCancel: PropTypes.func.isRequired,
};

BatchModelsMultiSelectComponent.contextTypes = {
    d2: PropTypes.object.isRequired,
};
