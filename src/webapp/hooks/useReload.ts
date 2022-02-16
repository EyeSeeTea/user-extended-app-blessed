import { useState, useCallback } from "react";

export function useReload(): [string, () => void] {
    const [state, updateState] = useState(() => new Date().toString());

    const reload = useCallback(() => {
        updateState(() => new Date().toString());
    }, []);

    return [state, reload];
}
