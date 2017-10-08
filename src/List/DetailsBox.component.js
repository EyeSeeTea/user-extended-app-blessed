import React from 'react';
import classes from 'classnames';

import FontIcon from 'material-ui/FontIcon/FontIcon';

import PropTypes from 'prop-types';
import Translate from 'd2-ui/lib/i18n/Translate.mixin';
import camelCaseToUnderscores from 'd2-utilizr/lib/camelCaseToUnderscores';
import Moment from 'react-moment';

export default React.createClass({
    propTypes: {
        fields: PropTypes.array,
        showDetailBox: PropTypes.bool,
        source: PropTypes.object,
        onClose: PropTypes.func,
    },

    mixins: [Translate],

    getDefaultProps() {
        return {
            fields: [
                'name',
                'username',
                'shortName',
                'code',
                'displayDescription',
                'created',
                'lastUpdated',
                'id',
                'href',
                'userRoles',
                'userGroups',
                'organisationUnits',
                'organisationUnitsOutput'
            ],
            showDetailBox: false,
            onClose: () => { },
        };
    },

    getDetailBoxContent() {
        if (!this.props.source) {
            return (
                <div className="detail-box__status">Loading details...</div>
            );
        }

        return this.props.fields
            .filter(fieldName => this.props.source[fieldName])
            .map(fieldName => {
                const valueToRender = this.getValueToRender(fieldName, this.props.source[fieldName]);

                return (
                    <div key={fieldName} className="detail-field">
                        <div className={`detail-field__label detail-field__${fieldName}-label`}>{this.getTranslation(camelCaseToUnderscores(fieldName))}</div>
                        <div className={`detail-field__value detail-field__${fieldName}`}>{valueToRender}</div>
                    </div>
                );
            });
    },

    getValueToRender(fieldName, value) {
        switch (fieldName) {
            case 'created':
            case 'lastUpdated':
                return (<Moment format='HH:mm A'>{value}</Moment>);
            case 'href':
                // Suffix the url with the .json extension to always get the json representation of the api resource
                return <a style={{ wordBreak: 'break-all' }} href={`${value}.json`} target="_blank">{value}</a>;
            case 'name':
                return value;
            case 'userRoles':
                const roles = [];
                value.map(roleItem => {
                    roles.push(<div key={roleItem}>{roleItem}</div>)
                });
                return <div>{roles}</div>;
            case 'userGroups':
                const groups = [];
                value.map(groupItem => {
                    groups.push(<div key={groupItem}>{groupItem}</div>)
                });
                return <div>{groups}</div>;
            case 'organisationUnits':
                const units = [];
                value.map(unitItem => {
                    units.push(<div key={unitItem}>{unitItem}</div>)
                });
                return <div>{units}</div>;
            case 'organisationUnitsOutput':
                const unitsOutput = [];
                value.map(unitItem => {
                    unitsOutput.push(<div key={unitItem}>{unitItem}</div>)
                });
                return <div>{unitsOutput}</div>;
            default:
                return value;
        }
    },

    render() {
        const classList = classes('details-box');

        if (this.props.showDetailBox === false) {
            return null;
        }

        return (
            <div className={classList}>
                <FontIcon className="details-box__close-button material-icons" onClick={this.props.onClose}>close</FontIcon>
                <div>
                    {this.getDetailBoxContent()}
                </div>
            </div>
        );
    },

});
