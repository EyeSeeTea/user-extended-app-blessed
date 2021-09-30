import _ from "lodash";
import { merge } from "lodash/fp";
import Dialog from "material-ui/Dialog/Dialog";
import FlatButton from "material-ui/FlatButton/FlatButton";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import PropTypes from "prop-types";
import React from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";

const styles = {
    dialog: {
        width: "100%",
        height: "100%",
    },
    contents: {
        fontSize: "0.7em",
    },
};

function prettyJson(obj) {
    return obj ? JSON.stringify(obj, null, 2) : null;
}

const InfoDialog = ({ t, title, style, onClose, response }) => {
    const details = _([
        t("metadata_error_description"),
        response.error || "Unknown error",
        prettyJson(response.payload),
        prettyJson(response.response),
    ])
        .compact()
        .join("\n\n");

    const actions = (
        <React.Fragment>
            <CopyToClipboard text={details}>
                <FlatButton label={t("copy_to_clipboard")} />
            </CopyToClipboard>
            ,
            <RaisedButton primary={true} label={t("close")} onClick={onClose} />,
        </React.Fragment>
    );

    return (
        <Dialog
            title={title}
            actions={actions}
            modal={false}
            open={true}
            style={merge(styles.dialog, style)}
            onRequestClose={onClose}
            autoScrollBodyContent={true}
        >
            <pre style={styles.contents}>{details}</pre>
        </Dialog>
    );
};

InfoDialog.propTypes = {
    t: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    response: PropTypes.shape({
        error: PropTypes.string,
        payload: PropTypes.object,
        response: PropTypes.object,
    }).isRequired,
    onClose: PropTypes.func.isRequired,
    style: PropTypes.any,
};

export default InfoDialog;
