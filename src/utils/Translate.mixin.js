import React from 'react';

const Translate = {
    contextTypes: {
        d2: React.PropTypes.object.isRequired,
    },

    getTranslation(...args) {
        return this.context.d2.i18n.getTranslation(...args);
    },
};

export default Translate;
