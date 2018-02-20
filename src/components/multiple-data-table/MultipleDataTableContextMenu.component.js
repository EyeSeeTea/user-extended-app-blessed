import React from 'react';
import Translate from 'd2-ui/lib/i18n/Translate.mixin';
import Menu from 'material-ui/Menu';
import MenuItem from 'material-ui/MenuItem';
import FontIcon from 'material-ui/FontIcon';
import Popover from 'material-ui/Popover';
import Paper from 'material-ui/Paper';

const MultipleDataTableContextMenu = React.createClass({
    propTypes: {
        actions: React.PropTypes.objectOf(React.PropTypes.func),
        showContextMenu: React.PropTypes.bool,
        activeItems: React.PropTypes.array,
        icons: React.PropTypes.object,
        target: React.PropTypes.object,
    },

    mixins: [Translate],

    getDefaultProps() {
        return {
            icons: {},
            actions: {},
        };
    },

    render() {
        const actionList = Object
            .keys(this.props.actions)
            .filter(menuActionKey => typeof this.props.actions[menuActionKey] === 'function');

        const cmStyle = {
            position: 'fixed',
        };
        const {actions, target, activeItems, icons, showContextMenu, ...popoverProps} = this.props;

        return (
            <Popover
                {...popoverProps}
                open={showContextMenu}
                anchorEl={target}
                anchorOrigin={{horizontal: 'middle', vertical: 'center'}}
                animated={false}
                style={cmStyle}
                animation={Paper}
            >
                <Menu className="data-table__context-menu" desktop>
                    {actionList.map((action) => {
                        const iconName = icons[action] ? icons[action] : action;

                        return (<MenuItem key={action}
                                          data-object-id={activeItems}
                                          className={'data-table__context-menu__item'}
                                          onClick={this.handleClick.bind(this, action)}
                                          primaryText={this.getTranslation(action)}
                                          leftIcon={<FontIcon className="material-icons">{iconName}</FontIcon>}
                                />);
                    })}
                </Menu>
            </Popover>
        );
    },

    handleClick(action) {
        this.props.actions[action].apply(this.props.actions, this.props.activeItems);
        this.props.onRequestClose && this.props.onRequestClose();
    },
});

export default MultipleDataTableContextMenu;
