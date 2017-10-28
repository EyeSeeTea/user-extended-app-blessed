import isArrayOfStrings from 'd2-utilizr/lib/isArrayOfStrings';
import isIterable from 'd2-utilizr/lib/isIterable';
import React from 'react';

import DataTableHeader from './DataTableHeader.component';
import DataTableRow from './DataTableRow.component';
import DataTableContextMenu from './DataTableContextMenu.component';

const DataTable = React.createClass({
    propTypes: {
        contextMenuActions: React.PropTypes.object,
        contextMenuIcons: React.PropTypes.object,
        primaryAction: React.PropTypes.func,
        isContextActionAllowed: React.PropTypes.func,
        headerClick: React.PropTypes.func
    },

    getInitialState() {
        return this.getStateFromProps(this.props);
    },

    componentWillReceiveProps(newProps) {
        this.setState(this.getStateFromProps(newProps));
    },

    getStateFromProps(props) {
        let dataRows = [];

        if (isIterable(props.rows)) {
            dataRows = props.rows instanceof Map ? Array.from(props.rows.values()) : props.rows;

            dataRows.map((rows) => {
                /** TODO: sort by columnName */
                // rows.sort((a, b) => {
                //     // console.log(a.lastUpdated, a.lastUpdated());
                //     return a.lastUpdated < b.lastUpdated ? -1 : 1;
                // });
                return rows;
            });
        }

        return {
            columns: isArrayOfStrings(props.columns) ? props.columns : ['name', 'lastUpdated'],
            dataRows
        };
    },

    renderContextMenu() {
        const actionAccessChecker = (this.props.isContextActionAllowed && this.props.isContextActionAllowed.bind(null, this.state.activeRow)) || (() => true);

        const actionsToShow = Object.keys(this.props.contextMenuActions || {})
            .filter(actionAccessChecker)
            .reduce((availableActions, actionKey) => {
                availableActions[actionKey] = this.props.contextMenuActions[actionKey];
                return availableActions;
            }, {});

        return (
            <DataTableContextMenu
                target={this.state.contextMenuTarget}
                onRequestClose={this._hideContextMenu}
                actions={actionsToShow}
                activeItem={this.state.activeRow}
                icons={this.props.contextMenuIcons}
            />
        );
    },

    handleHeaderClick(columnName, reverse) {
        this.setState({
            sortBy: columnName,
            reverse: reverse
        });
        this.props.headerClick(columnName, reverse);
    },

    renderHeaders() {
        return this.state.columns.map((headerName, index) => (
            <DataTableHeader key={index}
                             isOdd={Boolean(index % 2)}
                             name={headerName}
                             sort={this.state.sortBy === headerName}
                             reverse={(this.state.sortBy === headerName) ? this.state.reverse : true}
                             headerClick={this.handleHeaderClick}
            />
        ));
    },

    renderRows() {
        return this.state.dataRows
            .map((dataRowsSource, dataRowsId) => (
                <DataTableRow
                    key={dataRowsId}
                    dataSource={dataRowsSource}
                    columns={this.state.columns}
                    isActive={this.state.activeRow === dataRowsId}
                    itemClicked={this.handleRowClick}
                    primaryClick={this.props.primaryAction || (() => {})}
                />
            ));
    },

    render() {
        return (
            <div className="data-table">
                <div className="data-table__headers">
                    {this.renderHeaders()}
                    <DataTableHeader/>
                </div>
                <div className="data-table__rows">
                    {this.renderRows()}
                </div>
                {this.renderContextMenu()}
            </div>
        );
    },

    handleRowClick(event, rowSource) {
        this.setState({
            contextMenuTarget: event.currentTarget,
            showContextMenu: true,
            activeRow: rowSource !== this.state.activeRow ? rowSource : undefined,
        });
    },

    _hideContextMenu() {
        this.setState({
            activeRow: undefined,
            showContextMenu: false,
        });
    },
});

export default DataTable;