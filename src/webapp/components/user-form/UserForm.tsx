import {
    composeValidators,
    createMaxCharacterLength,
    createMinCharacterLength,
    createPattern,
    hasValue,
    InputFieldFF,
    string,
    alphaNumeric,
    CheckboxFieldFF,
} from "@dhis2/ui";
import React from "react";
import i18n from "../../../locales";
import { fullUidRegex } from "../../../utils/uid";
import { FormField } from "../form/fields/FormField";
import { PreviewInputFF } from "../form/fields/PreviewInputFF";
import { UserRoleGroupFF } from "./components/UserRoleGroupFF";
import { getUserFieldName, UserFormField, userRequiredFields } from "./utils";
import { OrgUnitsSelector } from "@eyeseetea/d2-ui-components";
import { useAppContext } from "../../contexts/app-context";

// TODO: new fields validators
const useValidations = (field: UserFormField): { validation?: (...args: any[]) => any; props?: object } => {
    switch (field) {
        case "id":
            return { validation: createPattern(fullUidRegex, i18n.t("Please provide a valid identifier")) };
        case "firstName":
        case "name":
        case "surname":
        case "apiUrl":
            return {
                validation: composeValidators(string, createMinCharacterLength(1), createMaxCharacterLength(255)),
            };
        case "username":
            return {
                validation: composeValidators(alphaNumeric, createMinCharacterLength(1), createMaxCharacterLength(255)),
            };
        case "email":
            return {
                validation: createPattern(
                    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
                    i18n.t("Please provide a valid email")
                ),
            };
        default: {
            const required = userRequiredFields.includes(field);
            return { validation: required ? hasValue : undefined };
        }
    }
};

export const RenderUserWizardField: React.FC<{ row: number; field: UserFormField }> = ({ row, field }) => {
    const name = `users[${row}].${field}`;
    const { api } = useAppContext();
    const { validation, props: validationProps = {} } = useValidations(field);
    const props = {
        name,
        placeholder: getUserFieldName(field),
        validate: validation,
        ...validationProps,
    };

    switch (field) {
        case "id":
        case "email":
        case "phoneNumber":
        case "whatsApp":
        case "facebookMessenger":
        case "skype":
        case "telegram":
        case "twitter":
        case "firstName":
        case "surname":
        case "name":
        case "openId":
        case "ldapId":
        case "apiUrl":
        case "username":
            return <FormField {...props} component={InputFieldFF} />;
        // TODO: Add repeat password validation
        case "password":
            return <FormField {...props} component={InputFieldFF} type="password" />;
        // TODO?: converted to date field?
        case "accountExpiry":
            return <FormField {...props} component={InputFieldFF} type="datetime-local" />;
        case "userGroups":
            return <FormField {...props} component={UserRoleGroupFF} modelType="userGroups" />;
        case "userRoles":
            return <FormField {...props} component={UserRoleGroupFF} modelType="userRoles" />;
        case "organisationUnits":
        case "dataViewOrganisationUnits":
            return (
                <FormField
                    {...props}
                    component={OrgUnitsSelector}
                    api={api}
                    controls={{
                        filterByLevel: true,
                        filterByGroup: true,
                        filterByProgram: false,
                        selectAll: false,
                    }}
                />
            );
        case "externalAuth":
        case "disabled":
            return <FormField {...props} component={CheckboxFieldFF} type={"checkbox"} />;
        default:
            return null;
    }
};

export const RenderUserImportField: React.FC<{ row: number; field: UserFormField }> = ({ row, field }) => {
    const name = `users[${row}].${field}`;

    const { validation, props: validationProps = {} } = useValidations(field);
    const props = {
        name,
        placeholder: getUserFieldName(field),
        validate: validation,
        ...validationProps,
    };

    switch (field) {
        case "userGroups":
        case "userRoles":
        case "organisationUnits":
        case "dataViewOrganisationUnits":
            return (
                <PreviewInputFF {...props}>
                    <RenderUserWizardField row={row} field={field} />
                </PreviewInputFF>
            );
        default:
            return <RenderUserWizardField row={row} field={field} />;
    }
};
