import React from "react";
import _ from "lodash";
import PropTypes from "prop-types";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";

const styles = {
    contents: {
        fontSize: "0.7em",
    },
};

function prettyJson(obj) {
    return obj ? JSON.stringify(obj, null, 2) : null;
}

const InfoDialog = ({ t, title, onClose, response }) => {
    const details = _([
        t("metadata_error_description"),
        response.error || "Unknown error",
        prettyJson(response.payload),
        prettyJson(response.response),
    ])
        .compact()
        .join("\n\n");

    return (
        <ConfirmationDialog
            title={title}
            isOpen={true}
            maxWidth={"sm"}
            fullWidth={true}
            onCancel={onClose}
            onSave={() => {
                navigator.clipboard.writeText(details);
            }}
            saveText={t("copy_to_clipboard")}
            cancelText={t("close")}
        >
            <pre style={styles.contents}>{details}</pre>
        </ConfirmationDialog>
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
};

export default InfoDialog;
