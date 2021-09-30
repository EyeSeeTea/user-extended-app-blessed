import { useEffect, useState } from "react";
import App from "./App/App.component";
import { initAppState } from "./App/appStateStore";

const params = { groupName: "userSection", modelType: "user" };

export const LegacyAppWrapper = props => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadList({ params }, () => setLoading(false));
    }, []);

    if (loading) return null;

    return <App>{props.children}</App>;
};

function initState({ params }) {
    initAppState({
        sideBar: {
            currentSection: params.groupName,
            currentSubSection: params.modelType,
        },
    });
}

function loadList({ params }, callback) {
    initState({ params });
    callback();
}
