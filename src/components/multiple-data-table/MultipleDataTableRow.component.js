import React, { isValidElement } from "react";
import classes from "classnames";
import isObject from "d2-utilizr/lib/isObject";
import isString from "d2-utilizr/lib/isString";
import isBoolean from "d2-utilizr/lib/isBoolean";
import moment from "moment";
import IconButton from "material-ui/IconButton";
import MoreVert from "material-ui/svg-icons/navigation/more-vert";
import Color from "d2-ui/lib/data-table/data-value/Color.component";
import Translate from "d2-ui/lib/i18n/Translate.mixin";
import Checkbox from "material-ui/Checkbox/Checkbox";
import FontIcon from "material-ui/FontIcon/FontIcon";

import "./MultipleDataTableRow.scss";

function SimpleCheckbox({ onClick, checked, ...otherProps }) {
    return (
        <span onClick={onClick}>
            <input
                type="checkbox"
                readOnly={true}
                checked={checked}
                className="simple-checkbox"
            ></input>
            <span></span>
        </span>
    );
}

function valueTypeGuess(valueType, value) {
    switch (valueType) {
        case "DATE":
            return moment(new Date(value)).fromNow();
        case "TEXT":
            if (/#([a-z0-9]{6})$/i.test(value)) {
                return <Color value={value} />;
            }
            return value;
        default:
            break;
    }

    return value;
}

function getValueAfterValueTypeGuess(dataSource, columnName) {
    if (
        dataSource &&
        dataSource.modelDefinition &&
        dataSource.modelDefinition.modelValidations &&
        dataSource.modelDefinition.modelValidations[columnName]
    ) {
        return valueTypeGuess(
            dataSource.modelDefinition.modelValidations[columnName].type,
            dataSource[columnName]
        );
    }

    return dataSource[columnName];
}

const MultipleDataTableRow = React.createClass({
    propTypes: {
        columns: React.PropTypes.array.isRequired,
        dataSource: React.PropTypes.object,
        isActive: React.PropTypes.bool,
        showSelectCell: React.PropTypes.bool,
        onSelectCellClicked: React.PropTypes.func,
        isEven: React.PropTypes.bool,
        isOdd: React.PropTypes.bool,
        hideActionsIcon: React.PropTypes.bool,
        itemClicked: React.PropTypes.func.isRequired,
        primaryClick: React.PropTypes.func.isRequired,
        style: React.PropTypes.object,
    },

    mixins: [Translate],

    styles: {
        selectCell: { width: 40 },
        actionButton: { width: "1%" },
        textWrapStyle: {
            width: "100%",
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
            position: "absolute",
            wordBreak: "break-all",
            wordWrap: "break-word",
            top: 0,
            bottom: 0,
            lineHeight: "50px",
            paddingRight: "1rem",
        },
    },

    renderSelectCell(isActive, isSelected) {
        const { onSelectCellClicked } = this.props;

        return (
            <div
                key="__select__"
                className="data-table__rows__row__column"
                style={this.styles.selectCell}
                onClick={ev => onSelectCellClicked && onSelectCellClicked(isActive, !isSelected)}
            >
                <SimpleCheckbox checked={isSelected} />
            </div>
        );
    },

    renderValue(value) {
        if (isString(value)) {
            return (
                <span title={value} style={this.styles.textWrapStyle}>
                    {value}
                </span>
            );
        } else if (isBoolean(value) && value) {
            return <FontIcon className="material-icons">check</FontIcon>;
        } else {
            return value;
        }
    },

    render() {
        const classList = classes("data-table__rows__row", {
            "data-table__rows__row--even": !this.props.isOdd,
            "data-table__rows__row--odd": this.props.isOdd,
            selected: this.props.isActive,
        });

        const dataSource = this.props.dataSource;

        const selectCells = this.props.showSelectCell
            ? [this.renderSelectCell(this.props.dataSource, this.props.isActive)]
            : [];

        const columns = selectCells.concat(
            this.props.columns.map((columnName, index) => {
                const rowValue = getValueAfterValueTypeGuess(dataSource, columnName);
                let displayValue;

                // Render objects by name or otherwise by their toString method.
                // ReactElements are also objects but we want to render them out normally, so they are excluded.
                if (isObject(rowValue) && !isValidElement(rowValue)) {
                    displayValue = rowValue.displayName || rowValue.name || rowValue.toString();
                } else {
                    displayValue = rowValue;
                }

                // TODO: PublicAccess Hack - need to make it so that value transformers can be registered
                if (columnName === "publicAccess") {
                    if (dataSource[columnName]) {
                        if (dataSource[columnName] === "rw------") {
                            displayValue = this.getTranslation("public_can_edit");
                        }

                        if (dataSource[columnName] === "r-------") {
                            displayValue = this.getTranslation("public_can_view");
                        }

                        if (dataSource[columnName] === "--------") {
                            displayValue = this.getTranslation("public_none");
                        }
                    }
                }

                return (
                    <div
                        key={index}
                        className={"data-table__rows__row__column"}
                        onContextMenu={this.handleContextClick}
                        onClick={this.handleClick}
                    >
                        {this.renderValue(displayValue)}
                    </div>
                );
            })
        );

        return (
            <div className={classList} style={this.props.style}>
                {columns}
                <div className={"data-table__rows__row__column"} style={this.styles.actionButton}>
                    {this.props.hideActionsIcon ? null : (
                        <IconButton
                            tooltip={this.getTranslation("actions")}
                            onClick={this.iconMenuClick}
                        >
                            <MoreVert />
                        </IconButton>
                    )}
                </div>
            </div>
        );
    },

    iconMenuClick(event) {
        event && event.preventDefault() && event.stopPropagation();
        this.props.itemClicked(event, this.props.dataSource);
    },

    handleContextClick(event) {
        event && event.preventDefault();
        this.props.itemClicked(event, this.props.dataSource);
    },

    handleClick(event) {
        this.props.primaryClick(event, this.props.dataSource);
    },
});

export default MultipleDataTableRow;
