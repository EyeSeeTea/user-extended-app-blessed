import React from 'react';
import Store from 'd2-ui/lib/store/Store';
import Translate from 'd2-ui/lib/i18n/Translate.mixin';
import GroupEditor from 'd2-ui/lib/group-editor/GroupEditor.component';
import GroupEditorWithOrdering from 'd2-ui/lib/group-editor/GroupEditorWithOrdering.component';

const MultiSelect = React.createClass({
    propTypes: {
        onChange: React.PropTypes.func.isRequired,
        options: React.PropTypes.arrayOf(React.PropTypes.object),
        selected: React.PropTypes.arrayOf(React.PropTypes.string),
        label: React.PropTypes.string,
        errors: React.PropTypes.arrayOf(React.PropTypes.string),
        isLoading: React.PropTypes.bool,
        sortable: React.PropTypes.bool,
        height: React.PropTypes.number,
    },

    getDefaultProps() {
        return {
            options: [],
            selected: [],
            label: "",
            errors: [],
            isLoading: false,
            sortable: false,
            height: 300,
        };
    },

    getInitialState() {
        const availableStore = Store.create();
        const assignedStore = Store.create();
        availableStore.setState(this.props.isLoading ? false : this.props.options);
        assignedStore.setState(this.props.isLoading ? false : this.props.selected);
        return {availableStore, assignedStore};
    },

    componentWillReceiveProps(nextProps) {
        this.state.availableStore.setState(nextProps.options);
        this.state.assignedStore.setState(nextProps.selected);
    },

    _onItemAssigned(newItems) {
        const assigned = this.state.assignedStore.state.concat(newItems);
        this.state.assignedStore.setState(assigned);
        this.props.onChange(assigned);
        return Promise.resolve();
    },

    _onItemRemoved(removedItems) {
        const assigned = _.difference(this.state.assignedStore.state, removedItems);
        this.state.assignedStore.setState(assigned);
        this.props.onChange(assigned);
        return Promise.resolve();
    },

    _onOrderChanged(assigned) {
        this.state.assignedStore.setState(assigned);
        this.props.onChange(assigned);
        return Promise.resolve();
    },

    render() {
        const { errors, label, sortable, height } = this.props;

        const styles = {
            labelStyle: {
                display: 'block',
                width: 'calc(100% - 60px)',
                lineHeight: '24px',
                color: 'rgba(0,0,0,0.3)',
                marginTop: '1rem',
                fontSize: 16,
            },
            errorStyle: {
                color: "red",
            },
        };

        const SelectedGroupEditor = sortable ? GroupEditorWithOrdering : GroupEditor;

        return (
            <div>
                <label style={styles.labelStyle}>
                    {label}
                </label>

                <div>
                    {errors.map((error, idx) =>
                        <p key={idx} style={styles.errorStyle}>{error}</p>
                    )}
                </div>

                <SelectedGroupEditor
                    itemStore={this.state.availableStore}
                    assignedItemStore={this.state.assignedStore}
                    onAssignItems={this._onItemAssigned}
                    onRemoveItems={this._onItemRemoved}
                    onOrderChanged={sortable ? this._onOrderChanged : undefined}
                    height={height}
                />
            </div>
        );
    },
});

export default MultiSelect;
