import React from "react";
import styled from "styled-components";
import { RenderUserWizardField } from "../user-form/UserForm";
import { getUserFieldName, UserFormField } from "../user-form/utils";

export const UserEditWizardStep: React.FC<UserEditWizardStepProps> = ({ fields }) => {
    return (
        <React.Fragment>
            {fields.map(field => (
                <Row key={`wizard-row-${field}`}>
                    <Label>{getUserFieldName(field)}</Label>
                    <RenderUserWizardField row={0} field={field} />
                </Row>
            ))}
        </React.Fragment>
    );
};

const Row = styled.div`
    margin: 20px 0;
`;

const Label = styled.b`
    display: block;
    margin-bottom: 15px;
`;

export interface UserEditWizardStepProps {
    fields: UserFormField[];
}
