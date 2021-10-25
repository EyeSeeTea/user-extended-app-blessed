import { useCallback } from "react";
import { useHistory } from "react-router-dom";

export const useGoBack = (defaultRoute = "/") => {
    const history = useHistory();

    return useCallback(
        (force = false) => {
            if (force || history.length <= 2) history.push(defaultRoute);
            else history.goBack();
        },
        [history, defaultRoute]
    );
};
