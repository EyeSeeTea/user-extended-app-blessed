import React from "react";
import { Tabs, Tab, Dialog } from "@material-ui/core";
import i18n from "../../../locales";
import Settings from "../../../legacy/models/settings";
import { useAppContext } from "../../contexts/app-context";
import SettingsDialog from "../../../legacy/components/SettingsDialog.component";
import { LoggerSettingsPage } from "../../pages/log-settings/LoggerSettingsPage";
import { Maybe } from "../../../types/utils";

type SettingsDialogModalProps = { onClose: (settings: Maybe<Settings>) => void };

export function useImportSettings() {
    const { d2 } = useAppContext();
    const [importSettings, setSettings] = React.useState<Settings>();

    React.useEffect(() => {
        Settings.build(d2).then((settings: Settings) => {
            setSettings(settings);
        });
    }, [d2]);

    return { importSettings };
}

export const SettingsDialogModal: React.FC<SettingsDialogModalProps> = props => {
    const { onClose } = props;
    const [selectedTab, setSelectedTab] = React.useState(0);
    const { importSettings } = useImportSettings();

    function onChangeTab(value: number) {
        setSelectedTab(value);
    }

    return (
        <Dialog open maxWidth="lg" fullWidth title={i18n.t("Settings")}>
            <Tabs value={selectedTab} onChange={(_event, value) => onChangeTab(value)}>
                <Tab label={i18n.t("Import")} />
                <Tab label={i18n.t("Logger")} />
            </Tabs>

            {selectedTab === 0 && importSettings && (
                <SettingsDialog settings={importSettings} onRequestClose={onClose} />
            )}
            {selectedTab === 1 && <LoggerSettingsPage onClose={() => onClose(undefined)} />}
        </Dialog>
    );
};
