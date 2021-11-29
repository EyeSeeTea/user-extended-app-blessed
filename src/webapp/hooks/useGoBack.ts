import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export const useGoBack = (defaultRoute = "/") => {
    const navigate = useNavigate();

    return useCallback(
        (force = false) => {
            if (force) navigate(defaultRoute);
            else navigate(-1);
        },
        [navigate, defaultRoute]
    );
};
