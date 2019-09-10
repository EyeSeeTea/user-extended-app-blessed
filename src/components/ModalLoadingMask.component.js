import React from "react";
import LoadingMask from "../loading-mask/LoadingMask.component";

const styles = {
    loadingMask: {
        position: "fixed",
        top: 0,
        left: 0,
        paddingTop: "200px",
        width: "100%",
        height: "100%",
        zIndex: 1000000,
        backgroundColor: "#000000",
        opacity: 0.5,
        textAlign: "center",
    },
};

const ModalLoadingMask = () => <LoadingMask style={styles.loadingMask} />;

export default ModalLoadingMask;
