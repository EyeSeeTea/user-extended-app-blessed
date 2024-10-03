import React from "react";
import styled from "styled-components";
import { Dropdown, DropdownItem, DropdownProps, useSnackbar } from "@eyeseetea/d2-ui-components";
import { useAppContext } from "../../contexts/app-context";

import i18n from "../../../locales";
import { Button, FormControlLabel, FormGroup, Switch } from "@material-ui/core";
import { LoggerSettings } from "../../../domain/entities/LoggerSettings";
import { useGetLoggerSettings, usePrograms } from "./useLogger";
import { Maybe } from "../../../types/utils";
import { DataElementAttrs, ProgramStageAttrs } from "../../../domain/entities/Program";
import { Id } from "../../../domain/entities/Ref";
import { isSuperAdmin } from "../../../domain/entities/User";

function convertToDropdownItem<T extends { id: string; name: string }>(data: T[]): DropdownItem[] {
    return data.map(item => ({ value: item.id, text: item.name }));
}

function dataElementsByType(dataElements: DataElementAttrs[], valueType: "FILE" | "DATE"): DataElementAttrs[] {
    return dataElements.filter(item => item.valueType === valueType);
}

function dataElementsByProgramStage(
    programStages: ProgramStageAttrs[],
    programStageId: Id,
    valueType: "FILE" | "DATE"
): DropdownItem[] {
    const dataElements = programStages.flatMap(programStage => {
        if (programStage.id !== programStageId) return [];
        return convertToDropdownItem(dataElementsByType(programStage.dataElements, valueType));
    });
    return dataElements;
}

type LoggerSettingsProps = { onClose: () => void };

export const LoggerSettingsPage: React.FC<LoggerSettingsProps> = props => {
    const { onClose } = props;
    const { compositionRoot, currentUser } = useAppContext();

    const isAdmin = React.useMemo(() => isSuperAdmin(currentUser), [currentUser]);

    const snackbar = useSnackbar();

    const { programs } = usePrograms();
    const { settings, setSettings } = useGetLoggerSettings({ programs });

    const programDropdownItems = programs.map(program => ({ value: program.id, text: program.name }));

    const currentProgram = programs.find(program => program.id === settings?.programId);

    const programStages = currentProgram?.programStages || [];

    const programAttributes = convertToDropdownItem(currentProgram?.attributes || []);

    const dataElementsFile = dataElementsByProgramStage(programStages, settings?.programStageId || "", "FILE");
    const dataElementsDate = dataElementsByProgramStage(programStages, settings?.programStageId || "", "DATE");

    const disableButton = settings ? LoggerSettings.isNotValid(settings) : true;

    const onEnableLogger = React.useCallback<React.ChangeEventHandler<HTMLInputElement>>(
        event => {
            setSettings(prev => {
                if (!prev) return undefined;
                return LoggerSettings.create({ ...prev, isEnabled: event.target.checked });
            });
        },
        [setSettings]
    );

    const onProgramChange = React.useCallback<DropdownProps["onChange"]>(
        value => {
            setSettings(prev => {
                if (!prev) return undefined;
                return LoggerSettings.create({
                    ...prev,
                    programId: value || "",
                    dataElementFileId: "",
                    programStageId: "",
                    usernameAttributeId: "",
                });
            });
        },
        [setSettings]
    );

    const onSubmit = React.useCallback<React.FormEventHandler<HTMLFormElement>>(
        event => {
            event.preventDefault();
            if (disableButton || !settings) return false;

            LoggerSettings.build(settings).match({
                success: settings => {
                    return compositionRoot.logger.save.execute(settings, currentUser).run(
                        () => {
                            snackbar.success(i18n.t("Settings saved"));
                            onClose();
                        },
                        error => snackbar.error(error)
                    );
                },
                error: error => {
                    snackbar.error(error.message);
                    return undefined;
                },
            });
        },
        [currentUser, settings, snackbar, disableButton, compositionRoot.logger.save, onClose]
    );

    const onChangeSettings = React.useCallback(
        (value: Maybe<string>, key: keyof LoggerSettings) => {
            setSettings(prev => {
                if (!prev) return undefined;
                return LoggerSettings.create({ ...prev, [key]: value || "" });
            });
        },
        [setSettings]
    );

    if (!isAdmin)
        return (
            <ErrorPermissionContainer>{i18n.t("Only admin user can edit logger settings")}</ErrorPermissionContainer>
        );

    return (
        <section>
            <SettingsForm onSubmit={onSubmit}>
                <CheckboxContainer>
                    <FormControlLabel
                        control={<Switch checked={settings?.isEnabled || false} onChange={onEnableLogger} />}
                        label={i18n.t("Enable Logger")}
                    />
                </CheckboxContainer>
                {settings?.isEnabled && (
                    <DropDownContainer>
                        <Dropdown
                            items={programDropdownItems}
                            label={i18n.t("Tracker Program")}
                            onChange={onProgramChange}
                            value={settings?.programId}
                        />

                        <Dropdown
                            items={programAttributes}
                            label={i18n.t("Username Attribute")}
                            onChange={value => onChangeSettings(value, "usernameAttributeId")}
                            value={settings?.usernameAttributeId}
                        />

                        <Dropdown
                            items={convertToDropdownItem(programStages)}
                            label={i18n.t("Program Stages")}
                            onChange={value => onChangeSettings(value, "programStageId")}
                            value={settings?.programStageId}
                        />

                        <Dropdown
                            items={dataElementsFile}
                            label={i18n.t("Data Element File ID")}
                            onChange={value => onChangeSettings(value, "dataElementFileId")}
                            value={settings?.dataElementFileId}
                        />

                        <Dropdown
                            items={dataElementsDate}
                            label={i18n.t("Data Element DateTime")}
                            onChange={value => onChangeSettings(value, "dataElementDateTimeId")}
                            value={settings?.dataElementDateTimeId}
                        />
                    </DropDownContainer>
                )}
                <ButtonContainer>
                    <Button type="submit" variant="contained" color="primary" disabled={disableButton}>
                        {i18n.t("Save")}
                    </Button>
                    <Button type="button" onClick={onClose}>
                        {i18n.t("Close")}
                    </Button>
                </ButtonContainer>
            </SettingsForm>
        </section>
    );
};

const SettingsForm = styled.form`
    background-color: #fff;
    padding: 2em;
`;

const CheckboxContainer = styled(FormGroup)`
    margin-inline-start: 10px;
`;

const DropDownContainer = styled(FormGroup)`
    gap: 1.5em;
    padding-block-start: 1em;
`;

const ButtonContainer = styled.div`
    display: flex;
    gap: 1em;
    margin: 10px;
`;

const ErrorPermissionContainer = styled.p`
    padding-inline: 1em;
`;
