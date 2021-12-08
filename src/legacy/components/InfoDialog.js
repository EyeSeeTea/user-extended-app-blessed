import React from "react";
import _ from "lodash";
import PropTypes from "prop-types";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import i18n from "../../locales";

const styles = {
    contents: {
        fontSize: "0.7em",
    },
};

function prettyJson(obj) {
    return obj ? JSON.stringify(obj, null, 2) : null;
}

const InfoDialog = ({ title, onClose, response }) => {
    const details = _([
        i18n.t("There was an error while posting metadata. Those are the details:"),
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
            saveText={i18n.t("Copy to clipboard")}
            cancelText={i18n.t("Close")}
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
