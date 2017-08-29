import React from 'react';
import LinearProgress from 'material-ui/LinearProgress/LinearProgress';
import PropTypes from 'prop-types';

export default React.createClass({
    propTypes: {
        isLoading: PropTypes.bool.isRequired,
    },

    getDefaultProps() {
        return {
            isLoading: false,
        };
    },

    render() {
        if (!this.props.isLoading) { return null; }

        return (
            <LinearProgress mode="indeterminate" style={{ backgroundColor: 'lightblue' }} />
        );
    },
});
