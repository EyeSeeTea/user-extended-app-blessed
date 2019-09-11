import isArrayOfStrings from "d2-utilizr/lib/isArrayOfStrings";
import isIterable from "d2-utilizr/lib/isIterable";
import React from "react";

import DataTableHeader from "./DataTableHeader.component";
import DataTableRow from "./DataTableRow.component";
import DataTableContextMenu from "./DataTableContextMenu.component";

const DataTable = React.createClass({
    propTypes: {
        contextMenuActions: React.PropTypes.object,
        contextMenuIcons: React.PropTypes.object,
        primaryAction: React.PropTypes.func,
        isContextActionAllowed: React.PropTypes.func,
        headerClick: React.PropTypes.func,
    },

    getInitialState() {
        const [sortBy, sortReverse] = this.props.initialOrder || [null, false];

        return {
            sortBy: sortBy,
            sortReverse: sortReverse,
            activeRow: null,
            contextMenuTarget: null,
            showContextMenu: false,
        };
    },

    renderContextMenu() {
        const actionAccessChecker =
            (this.props.isContextActionAllowed &&
                this.props.isContextActionAllowed.bind(null, this.state.activeRow)) ||
            (() => true);

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

    handleHeaderClick(columnName, sortReverse) {
        this.setState({
            sortBy: columnName,
            sortReverse: sortReverse,
        });
        if (this.props.headerClick) this.props.headerClick(columnName, sortReverse);
    },

    renderHeaders() {
        return this.props.columns.map(({ name, sortable }, index) => (
            <DataTableHeader
                key={index}
                isOdd={Boolean(index % 2)}
                name={name}
                sort={this.state.sortBy === name}
                reverse={this.state.sortBy === name ? this.state.sortReverse : true}
                headerClick={sortable ? this.handleHeaderClick : null}
            />
        ));
    },

    renderRows() {
        return this.props.rows.map((dataRowsSource, dataRowsId) => (
            <DataTableRow
                key={dataRowsId}
                dataSource={dataRowsSource}
                columns={this.props.columns}
                isActive={this.state.activeRow === dataRowsId}
                itemClicked={this.handleRowClick}
                primaryClick={this.props.primaryAction || (() => {})}
            />
        ));
    },

    render() {
        return (
            <div className="data-table">
                <div className="data-table__headers">{this.renderHeaders()}</div>
                <div className="data-table__rows">{this.renderRows()}</div>
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
