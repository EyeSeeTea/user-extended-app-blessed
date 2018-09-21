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
                'lastLogin',
                'id',
                'href',
                'userRoles',
                'userGroups',
                'organisationUnits',
                'dataViewOrganisationUnits'
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
                        <div className={`detail-field__label detail-field__${fieldName}-label`}>
                            {this.getTranslation(camelCaseToUnderscores(fieldName))}
                        </div>
                        <div className={`detail-field__value detail-field__${fieldName}`}>
                            {valueToRender}
                        </div>
                    </div>
                );
            });
    },

    getValueToRender(fieldName, value) {
        switch (fieldName) {
            case 'created':
            case 'lastUpdated':
                return (<Moment format='DD/MM/YYYY h:mm a'>{value}</Moment>);
            case 'href':
                return <a style={{ wordBreak: 'break-all' }} href={`${value}.json`} target="_blank">{value}</a>;
            case 'userRoles':
            case 'userGroups':
            case 'organisationUnits':
            case 'dataViewOrganisationUnits':
                const objs = _(value.toArray ? value.toArray() : value).sortBy("displayName").value();
                const contents = _(objs).isEmpty()
                    ? <div><i>{this.getTranslation('no_value')}</i></div>
                    : objs.map(obj => <div key={obj.id}>{obj.displayName}</div>);
                return (<div>{contents}</div>);
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
