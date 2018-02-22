import camelCaseToUnderscores from 'd2-utilizr/lib/camelCaseToUnderscores';
import React from 'react';
import classes from 'classnames';
import Translate from 'd2-ui/lib/i18n/Translate.mixin';
import FontIcon from 'material-ui/FontIcon/FontIcon';

const DataTableHeader = React.createClass({
    propTypes: {
        isOdd: React.PropTypes.bool,
        name: React.PropTypes.string,
        sort: React.PropTypes.bool,
        reverse: React.PropTypes.bool,
        headerClick: React.PropTypes.func,
    },

    mixins: [Translate],

    handleClick() {
        if (this.props.headerClick)
            this.props.headerClick(this.props.name, !this.props.reverse);
    },

    headerIcon() {
        if (this.props.sort) {
            return (this.props.reverse) ? <FontIcon className={'material-icons'}>arrow_downward</FontIcon>
                : <FontIcon className={'material-icons'}>arrow_upward</FontIcon>;
        }
        return null;
    },

    render() {
        const classList = classes(
            'data-table__headers__header',
            {
                'data-table__headers__header--even': !this.props.isOdd,
                'data-table__headers__header--odd': this.props.isOdd,
                'data-table__headers__header--click': this.props.headerClick
            },
        );

        return (
            <div className={classList} onClick={this.handleClick}>
                <div className={'data-table__headers__header__item'}>
                    <span>
                        {this.props.name ? this.getTranslation(camelCaseToUnderscores(this.props.name)) : null}
                    </span>
                    {this.headerIcon()}
                </div>
            </div>
        );
    },
});

export default DataTableHeader;