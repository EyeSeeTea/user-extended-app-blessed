import { useCallback, useState } from "react";
import useDeepCompareEffect from "use-deep-compare-effect";
import { Future, FutureData } from "../../domain/entities/Future";

type Callback = () => void;
type ResultType<Params extends any[], Obj> = {
    data?: Obj;
    error?: string;
    loading: boolean;
    cancel: Callback;
    refetch: (...params: Params) => Callback;
};

export function useFuture<Obj, Params extends any[]>(
    inputFuture: (...params: Params) => FutureData<Obj>,
    inputParams: Params
): ResultType<Params, Obj> {
    const [future] = useState(() => inputFuture);

    const [data, setData] = useState<Obj>();
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>();
    const [cancel, setCancel] = useState<Callback>(Future.noCancel);

    const refetch = useCallback(
        (...params: Params) => {
            setData(undefined);
            setLoading(true);
            setError(undefined);
            setCancel(Future.noCancel);

            const cancel = future(...params).run(
                data => {
                    setData(data);
                    setLoading(false);
                },
                error => {
                    setError(error);
                }
            );

            setCancel(() => cancel);
            return cancel;
        },
        [future]
    );

    useDeepCompareEffect(() => {
        return refetch(...inputParams);
    }, [refetch, inputParams]);

    return { data, loading, cancel, error, refetch };
}
