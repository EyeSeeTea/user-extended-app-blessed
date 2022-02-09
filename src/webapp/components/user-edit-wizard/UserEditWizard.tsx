import { Button, ButtonStrip, NoticeBox } from "@dhis2/ui";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { Paper, Step, StepLabel, Stepper } from "@material-ui/core";
import { ArrowBack, ArrowForward } from "@material-ui/icons";
import { FORM_ERROR } from "final-form";
import _ from "lodash";
import React, { FunctionComponent, useCallback, useState } from "react";
import { Form } from "react-final-form";
import styled from "styled-components";
import { User } from "../../../domain/entities/User";
import { useGoBack } from "../../hooks/useGoBack";
import { UserEditWizardStep, UserEditWizardStepProps } from "./UserEditWizardStep";

// Get user fields from: http://192.168.0.240:8086/api/users/{uid}.json
// Missing fields in ../user-form/utils
// if externalAccess only disable password
const steps: WizardStep[] = [
    {
        key: `general-info`,
        label: i18n.t("General info"),
        component: UserEditWizardStep,
        props: {
            fields: [
                "id",
                "name",
                "username",
                "firstName",
                "surname",
                "password",
                "disabled",
                "openId",
                "apiUrl"
            ],
        },
    },
    {
        key: `contact`,
        label: i18n.t("Contact"),
        component: UserEditWizardStep,
        props: {
            fields: [
                "email",
                "phoneNumber",
                "whatsApp",
                "facebookMessenger",
                "skype",
                "telegram",
                "twitter"
            ],
        },
    },
    {
        key: `roles`,
        label: i18n.t("Roles"),
        component: UserEditWizardStep,
        props: { 
            fields: [
                "userGroups",
                "userRoles"
            ]
        },
    },
    {
        key: `units`,
        label: i18n.t("Units"),
        component: UserEditWizardStep,
        props: { 
            fields: [
                "dataViewOrganisationUnits",
                "organisationUnits"
            ]
        },
    }
];

interface WizardStep {
    key: string;
    label: string;
    component: FunctionComponent<UserEditWizardStepProps>;
    props: UserEditWizardStepProps;
}

export interface UserEditWizardProps {
    user: User;
    onCancel: () => void;
    onSave: (user: User) => Promise<string | undefined>;
}

export const UserEditWizard: React.FC<UserEditWizardProps> = ({ user, onSave, onCancel }) => {
    const goBack = useGoBack();

    const onSubmit = useCallback(
        async (values: { users: User[] }) => {
            const user = values.users[0];
            if (!user) return { [FORM_ERROR]: i18n.t("Error saving user") };

            const error = await onSave(user);
            if (error) return { [FORM_ERROR]: error };

            goBack(true);
        },
        [onSave, goBack]
    );

    return (
        <Form<{ users: User[] }>
            autocomplete="off"
            onSubmit={onSubmit}
            initialValues={{ users: [user] }}
            render={({ handleSubmit, submitError }) => (
                <form onSubmit={handleSubmit}>
                    {submitError && (
                        <NoticeBox title={i18n.t("Error saving user")} error={true}>
                            {submitError}
                        </NoticeBox>
                    )}

                    <Wizard onCancel={onCancel}>
                        {steps.map(({ component: Component, props, key }) => (
                            <Component key={key} {...props} />
                        ))}
                    </Wizard>
                </form>
            )}
        />
    );
};

const Wizard: React.FC<{ onCancel: any }> = ({ children, onCancel }) => {
    const [step, setStep] = useState<string>(steps[0]?.key ?? "");
    const index = _.findIndex(steps, ({ key }) => key === step);
    const page = index > 0 ? index : 0;
    const activePage = React.Children.toArray(children)[page];

    const onNext = useCallback(() => {
        setStep(step => {
            const index = steps.findIndex(({ key }) => key === step);
            return steps[index + 1]?.key ?? step;
        });
    }, []);

    const onPrev = useCallback(() => {
        setStep(step => {
            const index = steps.findIndex(({ key }) => key === step);
            return steps[index - 1]?.key ?? step;
        });
    }, []);

    const jumpStep = useCallback((currentStep: string) => setStep(currentStep), []);

    return (
        <Container>
            <Wrapper>
                <StyledStepper activeStep={page} nonLinear={true}>
                    {steps.map(({ key, label }) => (
                        <Step key={key} onClick={() => jumpStep(key)}>
                            <StyledStepLabel>{label}</StyledStepLabel>
                        </Step>
                    ))}
                </StyledStepper>

                {activePage}
            </Wrapper>

            <ButtonsRow middle>
                <Button onClick={onPrev} icon={<ArrowBack />} />

                <Button type="submit" primary>
                    {i18n.t("Save")}
                </Button>

                <Button type="reset" onClick={onCancel}>
                    {i18n.t("Cancel")}
                </Button>

                <Button onClick={onNext} icon={<ArrowForward />} />
            </ButtonsRow>
        </Container>
    );
};

const StyledStepLabel = styled(StepLabel)`
    :hover {
        cursor: pointer;
    }
`;

const StyledStepper = styled(Stepper)`
    padding: 20px 20px 35px;
`;

const ButtonsRow = styled(ButtonStrip)`
    padding: 20px;

    button:focus::after {
        border-color: transparent !important;
    }
`;

const Container = styled.div`
    margin: 10px;
`;

const Wrapper = styled(Paper)`
    padding: 45px;
`;
