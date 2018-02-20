import React from 'react';
import isArrayOfStrings from 'd2-utilizr/lib/isArrayOfStrings';
import isIterable from 'd2-utilizr/lib/isIterable';
import Action from 'd2-ui/lib/action/Action';
import Checkbox from 'material-ui/Checkbox/Checkbox';
import update from 'immutability-helper';
import MultipleDataTableRow from './MultipleDataTableRow.component';
import DataTableHeader from './DataTableHeader.component';
import MultipleDataTableContextMenu from './MultipleDataTableContextMenu.component';
import _ from 'lodash';

/* Example of usage:

    <MultipleDataTable
        columns={[{name: "Name", sortable: true}, {name: "Age", sortable: true}]}
        rows={[{name: "Mary Bright", age: 63}, {name: "John Smith", age: 54}]}
        onColumnSort={([columnName, direction]) => onColumnSort(columnName, direction === "asc"))}
        isMultipleSelectionAllowed={true}
        showSelectColumn={true}
        contextActions={[
            {
                name: 'edit',
                multiple: false,
                primary: true,
                icon: "edit",
                onClick: row => edit(row),
                allowed: row => row.model.model.access.update,
            },
            {
                name: 'delete',
                multiple: false,
                icon: "delete",
                onClick: rows => delete(rows),
                allowed: rows => _(rows).every(row => row.model.model.access.delete),
            },
        ]}
    />
*/
export function fromActionsDefinitions(actions) {
    const actionsByName = _.keyBy(actions, "name");
    const contextActions = Action.createActionsFromNames(actions.map(a => a.name));
    const contextMenuIcons = _(actions).map(a => [a.name, a.icon || a.name]).fromPairs().value();
    const primaryActionDefinition = actions.find(action => action.primary)
    const primaryAction = primaryActionDefinition ? contextActions[primaryActionDefinition.name] : null;

    const isContextActionAllowed = function(selection, actionName) {
        const action = actionsByName[actionName];

        if (!action || !selection) {
            return false;
        } else if (!action.multiple && selection.length != 1) {
            return false;
        } else if (action.allowed) {
            return action.allowed(selection);
        } else {
            return true;
        }
    };

    actions.filter(a => a.onClick).forEach(action => {
        contextActions[action.name].subscribe(({data}) => {
            const arg = action.multiple && !_.isArray(data) ? [data] : data;
            action.onClick(arg);
        });
    });

    return {contextActions, contextMenuIcons, isContextActionAllowed, primaryAction};
};

const MultipleDataTable = React.createClass({
    propTypes: {
        isMultipleSelectionAllowed: React.PropTypes.bool,
        columns: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
        hideRowsActionsIcon: React.PropTypes.bool,
        onColumnSort: React.PropTypes.func,
        styles: React.PropTypes.shape({
            table: React.PropTypes.object,
            header: React.PropTypes.object,
        }),
        rows: React.PropTypes.arrayOf(React.PropTypes.shape({id: React.PropTypes.any.isRequired})),
        activeRows: React.PropTypes.arrayOf(React.PropTypes.object),
        onActiveRowsChange: React.PropTypes.func,
        showSelectColumn: React.PropTypes.bool,
    },

    getDefaultProps() {
        return {
            styles: {},
            activeRows: null,
            onActiveRowsChange: () => {},
        };
    },

    getInitialState() {
        return this.getStateFromProps(this.props);
    },

    componentWillReceiveProps(newProps) {
        if (!_.isEqual(newProps, this.props))
            this.setState(this.getStateFromProps(newProps));
    },

    onSelectCellClicked(row, isChecked) {
        const isSelected = this.state.activeRows.find(r => r.id === row.id);

        if (isChecked || !isSelected) {
            this.setState({activeRows: this.state.activeRows.concat([row])}, this.notifyActiveRows);
        } else if (!isChecked || isSelected) {
            this.setState({activeRows: this.state.activeRows.filter(r => r.id !== row.id)}, this.notifyActiveRows);
        }
    },

    getStateFromProps(props) {
        let dataRows = [];

        if (isIterable(props.rows)) {
            dataRows = props.rows instanceof Map ? Array.from(props.rows.values()) : props.rows;
        }

        // Keep selections on table redraw unless forced by props
        const activeRows = props.activeRows ||
            _(dataRows).intersectionBy(this.state && this.state.activeRows || [], "id").value();

        return {
            columns: props.columns,
            activeRows: activeRows,
            dataRows: dataRows,
            contextActionsData: fromActionsDefinitions(props.contextActions),
        };
    },

    renderContextMenu() {
        const {contextActions, contextMenuIcons, isContextActionAllowed} =
            this.state.contextActionsData;
        const actionAccessChecker = isContextActionAllowed ?
            isContextActionAllowed.bind(null, this.state.activeRows) : () => true;

        const actionsToShow = Object.keys(contextActions || {})
            .filter(actionAccessChecker)
            .reduce((availableActions, actionKey) => {
                availableActions[actionKey] = contextActions[actionKey];
                return availableActions;
            }, {});

        return (
                <MultipleDataTableContextMenu
                    target={this.state.contextMenuTarget}
                    onRequestClose={this._hideContextMenu}
                    actions={actionsToShow}
                    activeItems={this.state.activeRows}
                    showContextMenu={this.state.showContextMenu}
                    icons={contextMenuIcons}
                />
        );
    },

    _onColumnSortingToggle(headerName) {
        const newSortingDirection = this.state.sorting && this.state.sorting[0] == headerName ?
            (this.state.sorting[1] == "asc" ? "desc" : "asc") : "asc";
        const newSorting = [headerName, newSortingDirection];
        this.setState({sorting: newSorting});
        this.props.onColumnSort && this.props.onColumnSort(newSorting);
    },

    onColumnSelectAllClicked() {
        if (_(this.state.activeRows).isEmpty()) {
            this.setState({activeRows: this.state.dataRows});
        } else {
            this.setState({activeRows: []});
        }
    },

    renderSelectHeader() {
        const selectedHeaderChecked = (
            this.state.dataRows.length > 0 &&
            this.state.dataRows.length == this.state.activeRows.length &&
            _(this.state.dataRows).difference(this.state.activeRows).isEmpty()
        );
        return (
            <Checkbox
                checked={selectedHeaderChecked}
                iconStyle={{width: 'auto'}}
            />
        );
    },

    renderHeaders() {
        const sortableColumns = this.props.sortableColumns || [];
        const [currentSortedColumn, currentSortedDirection] = (this.state.sorting || []);
        const selectColumns = this.props.showSelectColumn ? [{
            name: "_selected",
            onClick: this.onColumnSelectAllClicked,
            sortable: false,
            contents: this.renderSelectHeader()
        }] : [];
        const dataColumns = this.state.columns
        const allColumns = selectColumns.concat(dataColumns);

        return allColumns.map((column, index) => (
            <DataTableHeader
                key={index}
                isOdd={Boolean(index % 2)}
                name={column.name}
                contents={column.contents}
                sort={currentSortedColumn === column.name}
                reverse={currentSortedDirection === "desc"}
                headerClick={column.onClick || (column.sortable ? this._onColumnSortingToggle.bind(this, column.name) : null)}
            />
        ));
    },

    renderRows() {
        return this.state.dataRows
            .map((dataRowsSource, dataRowsId) => {
                return (
                    <MultipleDataTableRow
                        key={dataRowsId}
                        dataSource={dataRowsSource}
                        columns={this.state.columns.map(c => c.name)}
                        hideActionsIcon={this.props.hideRowsActionsIcon}
                        isActive={this.isRowActive(dataRowsSource)}
                        showSelectCell={this.props.showSelectColumn}
                        onSelectCellClicked={this.onSelectCellClicked}
                        itemClicked={this.handleRowClick}
                        primaryClick={this.handlePrimaryClick}
                        style={dataRowsSource._style}
                    />
                );
            });
    },
    
    render() {
        const defaultStyles = {
            table: {},
            header: {},
        }
        const styles = _.merge({}, defaultStyles, this.props.styles);

        return (
           <div className="data-table" style={styles.table}>
               <div className="data-table__headers">
                    {this.renderHeaders()}
                    <DataTableHeader />
               </div>
               <div className="data-table__rows">
                   {this.renderRows()}
               </div>
               {this.renderContextMenu()}
           </div>
        );
    },
    
    isRowActive(rowSource) {
        if(!this.state.activeRows){
            return false;
        }
        return _.includes(this.state.activeRows, rowSource);
    },
    
    isEventCtrlClick(event) {
        return this.props.isMultipleSelectionAllowed && event && event.ctrlKey;
    },

    notifyActiveRows() {
        this.props.onActiveRowsChange(this.state.activeRows);
    },

    handleRowClick(event, rowSource) {
        //Update activeRows according to click|ctlr+click
        var newActiveRows;
        if(event.isIconMenuClick){
            newActiveRows = [rowSource];
        }else if (this.isEventCtrlClick(event) || this.isRowActive(rowSource)){
            //Remain selection + rowSource if not already selected
            newActiveRows = this.updateContextSelection(rowSource);
        }else{
            //Context click just selects current row
            newActiveRows =[rowSource];
        }
          
        //Update state
        this.setState({
            contextMenuTarget: event.currentTarget,
            showContextMenu: true,
            activeRows: newActiveRows
        }, this.notifyActiveRows);
    },
    
    handlePrimaryClick(event, rowSource) {
        //Click -> Clears selection, Invoke external action (passing event)
        const {primaryAction} = this.state.contextActionsData;

        if(!this.isEventCtrlClick(event)) {
            this.setState({
                activeRows: []
            }, this.notifyActiveRows);
            primaryAction && primaryAction(rowSource);
            return;
        }
        
        //Ctrl + Click -> Update selection
        const newActiveRows = this.updatePrimarySelection(rowSource);
        this.setState({
            activeRows:newActiveRows,
            showContextMenu: false,
        }, this.notifyActiveRows);
    },
       
    _hideContextMenu() {
        this.setState({
            showContextMenu: false,
        }, this.notifyActiveRows);
    },
    
    updateContextSelection(rowSource){
        return this.updateSelection(rowSource,true);
    },
    
    updatePrimarySelection(rowSource){
        return this.updateSelection(rowSource, false);
    },
    
    updateSelection(rowSource, isContextClick){
        const alreadySelected = this.isRowActive(rowSource);
        
        //ctx click + Already selected -> Same selection
        if(isContextClick && alreadySelected){
            return this.state.activeRows
        }
                 
        //click + Already selected -> Remove from selection
        if(alreadySelected){
            return this.state.activeRows.filter((nRow) => nRow!==rowSource);
        }
        
        //!already selected -> Add to selection
        return update(this.state.activeRows?this.state.activeRows:[], {$push: [rowSource]});
    }
});

export default MultipleDataTable;
