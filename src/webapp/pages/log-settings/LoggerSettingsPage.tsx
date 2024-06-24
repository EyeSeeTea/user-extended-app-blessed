import React from "react";
import styled from "styled-components";
import { Dropdown, DropdownProps, useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import { useAppContext } from "../../contexts/app-context";
import { Program } from "../../../domain/entities/Program";
import { Id } from "../../../domain/entities/Ref";
import i18n from "../../../locales";
import { Button, Checkbox, FormControlLabel, FormGroup } from "@material-ui/core";
import { LoggerSettings } from "../../../domain/entities/LoggerSettings";
import { useGoBack } from "../../hooks/useGoBack";
import { PageHeader } from "../../components/page-header/PageHeader";

export const LoggerSettingsPage: React.FC<LoggerSettingsPageProps> = () => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const goBack = useGoBack();
    const loading = useLoading();
    const [programs, setPrograms] = React.useState<Program[]>([]);
    const [selectedProgramId, setSelectedProgramId] = React.useState<Id | undefined>();
    const [messageId, setMessageId] = React.useState<Id | undefined>();
    const [messageType, setMessageType] = React.useState<Id | undefined>();
    const [enableLogger, setEnableLogger] = React.useState(false);

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

    React.useEffect(() => {
        if (programs.length === 0) return;
        return compositionRoot.logger.get.execute().run(
            result => {
                setSelectedProgramId(result.programId);
                setMessageId(result.messageId);
                setMessageType(result.messageTypeId);
                setEnableLogger(result.isEnabled);
            },
            error => {
                snackbar.error(error);
            }
        );
    }, [programs, compositionRoot.logger.get, snackbar]);

    const programDropdownItems = programs.map(program => ({ value: program.id, text: program.name }));

    const onEnableLogger = React.useCallback<React.ChangeEventHandler<HTMLInputElement>>(event => {
        setEnableLogger(event.target.checked);
    }, []);

    const onProgramChange = React.useCallback<DropdownProps["onChange"]>(value => {
        setSelectedProgramId(value);
        setMessageId(undefined);
        setMessageType(undefined);
    }, []);

    const dataElements =
        programs
            .find(program => program.id === selectedProgramId)
            ?.dataElements.map(dataElement => ({ value: dataElement.id, text: dataElement.name })) || [];

    const disableButton = !selectedProgramId || !messageId || !messageType;

    const onSubmit = React.useCallback<React.FormEventHandler<HTMLFormElement>>(
        event => {
            event.preventDefault();
            if (disableButton) return false;

            LoggerSettings.build({
                isEnabled: enableLogger,
                programId: selectedProgramId,
                messageId: messageId,
                messageTypeId: messageType,
            }).match({
                success: settings => {
                    return compositionRoot.logger.save.execute(settings).run(
                        () => {
                            snackbar.success(i18n.t("Settings saved"));
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
        [enableLogger, selectedProgramId, messageId, messageType, snackbar, disableButton, compositionRoot.logger.save]
    );

    return (
        <section>
            <PageHeader onBackClick={goBack} title={i18n.t("Logger Settings")} />
            <SettingsForm onSubmit={onSubmit}>
                <CheckboxContainer>
                    <FormControlLabel
                        control={<Checkbox checked={enableLogger} onChange={onEnableLogger} />}
                        label={i18n.t("Enable Logger")}
                    />
                </CheckboxContainer>
                <DropDownContainer>
                    <Dropdown
                        items={programDropdownItems}
                        label={i18n.t("Program Event")}
                        onChange={onProgramChange}
                        value={selectedProgramId}
                    />

                    <Dropdown
                        items={dataElements}
                        label={i18n.t("Message ID")}
                        onChange={setMessageId}
                        value={messageId}
                    />

                    <Dropdown
                        items={dataElements}
                        label={i18n.t("Message Type")}
                        onChange={setMessageType}
                        value={messageType}
                    />
                    <ButtonContainer>
                        <Button type="submit" variant="contained" color="primary" disabled={disableButton} size="large">
                            {i18n.t("Save")}
                        </Button>
                    </ButtonContainer>
                </DropDownContainer>
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
    margin-inline-start: 10px;
`;

export type LoggerSettingsPageProps = {};
