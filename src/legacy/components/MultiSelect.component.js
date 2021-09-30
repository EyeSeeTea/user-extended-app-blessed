import GroupEditor from "d2-ui/lib/group-editor/GroupEditor.component";
import GroupEditorWithOrdering from "d2-ui/lib/group-editor/GroupEditorWithOrdering.component";
import Store from "d2-ui/lib/store/Store";
import _ from "lodash";
import PropTypes from "prop-types";
import React from "react";

class MultiSelect extends React.Component {
    static propTypes = {
        onChange: PropTypes.func.isRequired,
        options: PropTypes.arrayOf(PropTypes.object),
        selected: PropTypes.arrayOf(PropTypes.string),
        label: PropTypes.string,
        errors: PropTypes.arrayOf(PropTypes.string),
        isLoading: PropTypes.bool,
        sortable: PropTypes.bool,
        height: PropTypes.number,
        filterText: PropTypes.string,
    };

    styles = {
        labelStyle: {
            display: "block",
            width: "calc(100% - 60px)",
            lineHeight: "24px",
            color: "rgba(0,0,0,0.3)",
            marginTop: "1rem",
            fontSize: 16,
        },
        errorStyle: {
            color: "red",
        },
    };

    static defaultProps = {
        options: [],
        selected: [],
        label: "",
        errors: [],
        isLoading: false,
        sortable: false,
        height: 300,
    };

    constructor(props, context) {
        super(props, context);

        const availableStore = Store.create();
        const assignedStore = Store.create();
        availableStore.setState(this.props.isLoading ? false : this.props.options);
        assignedStore.setState(this.props.isLoading ? false : this.props.selected);
        this.state = { availableStore, assignedStore };
    }

    componentWillReceiveProps = nextProps => {
        this.state.availableStore.setState(nextProps.options);
        this.state.assignedStore.setState(nextProps.selected);
    };

    _onItemAssigned = newItems => {
        const assigned = this.state.assignedStore.state.concat(newItems);
        this.state.assignedStore.setState(assigned);
        this.props.onChange(assigned);
        return Promise.resolve();
    };

    _onItemRemoved = removedItems => {
        const assigned = _.difference(this.state.assignedStore.state, removedItems);
        this.state.assignedStore.setState(assigned);
        this.props.onChange(assigned);
        return Promise.resolve();
    };

    _onOrderChanged = assigned => {
        this.state.assignedStore.setState(assigned);
        this.props.onChange(assigned);
        return Promise.resolve();
    };

    render = () => {
        const { errors, label, sortable, height, filterText } = this.props;
        const { styles } = this;
        const SelectedGroupEditor = sortable ? GroupEditorWithOrdering : GroupEditor;

        return (
            <div>
                <label style={styles.labelStyle}>{label}</label>

                <div>
                    {errors.map((error, idx) => (
                        <p key={idx} style={styles.errorStyle}>
                            {error}
                        </p>
                    ))}
                </div>

                <SelectedGroupEditor
                    itemStore={this.state.availableStore}
                    assignedItemStore={this.state.assignedStore}
                    onAssignItems={this._onItemAssigned}
                    onRemoveItems={this._onItemRemoved}
                    onOrderChanged={sortable ? this._onOrderChanged : undefined}
                    height={height}
                    filterText={filterText}
                />
            </div>
        );
    };
}

export default MultiSelect;
