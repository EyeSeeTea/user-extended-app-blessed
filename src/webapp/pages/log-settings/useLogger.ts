import { useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import React from "react";
import { LoggerSettings } from "../../../domain/entities/LoggerSettings";
import { Program } from "../../../domain/entities/Program";
import { useAppContext } from "../../contexts/app-context";

type UseGetLoggerSettingsProps = { programs: Program[] };

export function useGetLoggerSettings(props: UseGetLoggerSettingsProps) {
    const { programs } = props;
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const [settings, setSettings] = React.useState<LoggerSettings | undefined>();

    React.useEffect(() => {
        if (programs.length === 0) return;
        return compositionRoot.logger.get.execute().run(
            result => {
                setSettings(result);
            },
            error => {
                snackbar.error(error);
            }
        );
    }, [programs, compositionRoot.logger.get, snackbar]);

    return { settings, setSettings };
}

export function usePrograms() {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const loading = useLoading();
    const [programs, setPrograms] = React.useState<Program[]>([]);

    React.useEffect(() => {
        loading.show();
        return compositionRoot.programs.get.execute().run(
            result => {
                setPrograms(result);
                loading.hide();
            },
            error => {
                snackbar.error(error);
                loading.hide();
            }
        );
    }, [compositionRoot.programs.get, snackbar, loading]);

    return { programs };
}
