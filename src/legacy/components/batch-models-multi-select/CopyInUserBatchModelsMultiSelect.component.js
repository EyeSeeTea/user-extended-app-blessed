import LoadingMask from "d2-ui/lib/loading-mask/LoadingMask.component";
import _ from "lodash";
import Dialog from "material-ui/Dialog/Dialog";
import FlatButton from "material-ui/FlatButton/FlatButton";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import TextField from "material-ui/TextField/TextField";
import Toggle from "material-ui/Toggle/Toggle";
import PropTypes from "prop-types";
import React from "react";
import snackActions from "../../Snackbar/snack.actions";
import MultiSelect from "../MultiSelect.component";

export default class CopyInUserBatchModelsMultiSelectComponent extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.state = {
            state: "loading",
            parents: null,
            allChildren: null,
            selectedIds: null,
            filterText: "",
            updateStrategy: this.props.parents.length === 1 ? "merge" : "replace",
            copyUserGroups: false,
            copyUserRoles: false,
            copyOrgUnitOutput: false,
            copyOrgUnitsCapture: false,
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
        column1Toggle: {
            width: 145,
        },
        column2Toggle: {
            width: 135,
        },
        strategyToggle: {
            width: 85,
            marginTop: 10,
            marginRight: 10,
            float: "right",
        },

        flexContainer: {
            display: "flex",
        },
        ColumnTwo: {
            marginLeft: 20,
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
                    selectedIds: [],
                })
            )
            .catch(err => this.close(this.getTranslation("error_loading_data") + " :" + err.toString()));
    };

    close(snackMessage = null) {
        if (snackMessage) snackActions.show({ message: snackMessage });
        this.props.onRequestClose();
    }

    renderStrategyToggle = () => {
        const label =
            this.getTranslation("update_strategy") +
            ": " +
            this.getTranslation("update_strategy_" + this.state.updateStrategy);
        return (
            <Toggle
                label={label}
                style={{ width: 280, float: "right", marginTop: 20, marginRight: 15 }}
                checked={this.state.updateStrategy === "replace"}
                onToggle={(ev, newValue) => this.setState({ updateStrategy: newValue ? "replace" : "merge" })}
            />
        );
    };

    copyInUserSave = async () => {
        const {
            parents,
            selectedIds,
            copyUserGroups,
            copyUserRoles,
            copyOrgUnitOutput,
            copyOrgUnitsCapture,
            updateStrategy,
        } = this.state;
        this.setState({ state: "loading" });
        const copyAccessElements = {
            userGroups: copyUserGroups,
            userRoles: copyUserRoles,
            orgUnitOutput: copyOrgUnitOutput,
            orgUnitCapture: copyOrgUnitsCapture,
        };
        await this.props.model
            .copyInUserSave(parents, selectedIds, copyAccessElements, updateStrategy)
            .then(() => this.close(this.props.onSuccess))
            .catch(() => this.close(this.props.onError))
            .finally(() => this.setState({ state: "ready" }));
    };

    onChange(selectedIds) {
        this.setState({ selectedIds });
    }

    render = () => {
        switch (this.state.state) {
            case "loading":
                return (
                    <div style={this.styles.loadingMask}>
                        <LoadingMask />
                    </div>
                );
            case "error":
                return <div style={this.styles.loadingMask}>{this.state.error}</div>;
            case "ready":
                return this.renderForm();
            default:
                throw new Error(`Unknown state: ${this.state.state}`);
        }
    };

    onFilterTextChange(event) {
        this.setState({ filterText: event.target.value });
    }

    copy = () => {
        const { copyUserGroups, copyUserRoles, copyOrgUnitOutput, copyOrgUnitsCapture, selectedIds } = this.state;

        if (!copyUserGroups && !copyUserRoles && !copyOrgUnitOutput && !copyOrgUnitsCapture) {
            snackActions.show({ message: this.getTranslation("select_one_toggle") });
        } else if (_.isEmpty(selectedIds)) {
            snackActions.show({ message: this.getTranslation("select_at_least_one_user") });
        } else {
            this.copyInUserSave();
        }
    };

    getDialogButtons = () => {
        const isLoading = this.state.state === "loading";

        return (
            <React.Fragment>
                <FlatButton
                    label={this.getTranslation("cancel")}
                    onClick={this.props.onRequestClose}
                    style={this.styles.cancelButton}
                />
                ,
                <RaisedButton
                    primary
                    label={this.getTranslation("save")}
                    onClick={this.copy.bind(this)}
                    disabled={isLoading}
                />
                ,
            </React.Fragment>
        );
    };

    //eslint-disable-next-line
    render = () => {
        const isLoading = this.state.state === "loading";
        const { parents, allChildren, filterText, selectedIds } = this.state;
        const title = this.props.getTitle(parents, allChildren);
        const parentName = this.props.parents[0].name;
        const options = _(allChildren || [])
            .sortBy("name")
            .map(obj => ({ value: obj.id, text: `${obj.name} (${obj.userCredentials.username})` }))
            .filter(obj => obj.text !== parentName)
            .value();

        return (
            <Dialog
                title={title}
                actions={this.getDialogButtons()}
                autoScrollBodyContent
                autoDetectWindowHeight
                contentStyle={this.styles.dialog}
                open={true}
                onRequestClose={this.props.onRequestClose}
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
                <div style={this.styles.flexContainer}>
                    <div>
                        <Toggle
                            label={"User Groups"}
                            style={this.styles.column1Toggle}
                            checked={this.state.copyUserGroups === true}
                            onToggle={(ev, newValue) => this.setState({ copyUserGroups: newValue })}
                        />
                        <Toggle
                            label={"OU Outputs"}
                            style={this.styles.column1Toggle}
                            checked={this.state.copyOrgUnitOutput === true}
                            onToggle={(ev, newValue) => this.setState({ copyOrgUnitOutput: newValue })}
                        />
                    </div>
                    <div style={this.styles.ColumnTwo}>
                        <Toggle
                            label={"User Roles"}
                            style={this.styles.column2Toggle}
                            checked={this.state.copyUserRoles === true}
                            onToggle={(ev, newValue) => this.setState({ copyUserRoles: newValue })}
                        />
                        <Toggle
                            label={"Org Units"}
                            style={this.styles.column2Toggle}
                            checked={this.state.copyOrgUnits === true}
                            onToggle={(ev, newValue) => this.setState({ copyOrgUnits: newValue })}
                        />
                    </div>
                </div>
            </Dialog>
        );
    };
}

CopyInUserBatchModelsMultiSelectComponent.propTypes = {
    model: PropTypes.object.isRequired,
    parents: PropTypes.arrayOf(PropTypes.object).isRequired,
    onRequestClose: PropTypes.func.isRequired,
};

CopyInUserBatchModelsMultiSelectComponent.contextTypes = {
    d2: PropTypes.object.isRequired,
};
