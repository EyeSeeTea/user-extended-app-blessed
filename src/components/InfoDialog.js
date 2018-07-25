import React from 'react';
import PropTypes from 'prop-types';
import Dialog from 'material-ui/Dialog/Dialog';
import stylePropType from 'react-style-proptype';
import RaisedButton from 'material-ui/RaisedButton/RaisedButton';

const InfoDialog = ({ title, closeLabel, style, onClose, children }) => {
    const actions = [
      <RaisedButton primary={true} label={closeLabel} primary={true} onClick={onClose} />,
    ];

    return (
        <Dialog
          title={title}
          actions={actions}
          modal={false}
          open={true}
          style={style}
          onRequestClose={onClose}
          autoScrollBodyContent={true}
        >
          {children}
        </Dialog>
    );
};

InfoDialog.propTypes = {
    title: PropTypes.string.isRequired,
    closeLabel: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    style: stylePropType,
}

export default InfoDialog;
