import React from 'react';
import CircularProgress from 'material-ui/CircularProgress';

export default React.createClass({
    render() {
        const loadingStatusMask = {
            left: '45%',
            position: 'fixed',
            top: '45%',
        };

        return (
            <CircularProgress
                mode="indeterminate"
                size={90}
                style={loadingStatusMask}
            />
        );
    },
});
