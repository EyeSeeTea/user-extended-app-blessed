import {
    alphaNumeric,
    CheckboxFieldFF,
    composeValidators,
    createMaxCharacterLength,
    createMinCharacterLength,
    createPattern,
    hasValue,
    InputFieldFF,
    SingleSelectFieldFF,
    string,
} from "@dhis2/ui";
import { OrgUnitsSelector } from "@eyeseetea/d2-ui-components";
import React, { useEffect, useState } from "react";
import { Locale } from "../../../domain/entities/Locale";
import i18n from "../../../locales";
import { fullUidRegex } from "../../../utils/uid";
import { useAppContext } from "../../contexts/app-context";
import { FormField } from "../form/fields/FormField";
import { PreviewInputFF } from "../form/fields/PreviewInputFF";
import { UserRoleGroupFF } from "./components/UserRoleGroupFF";
import { getUserFieldName, UserFormField, userRequiredFields } from "./utils";

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
        // Why not use @dhis2/ui email validator?
        case "email":
            return {
                validation: createPattern(
                    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
                    i18n.t("Please provide a valid email")
                ),
            };
        // TODO: Password length is admin set option /api/systemSettings/minPasswordLength
        case "password":
            return {
                validation: composeValidators(
                    string,
                    createMinCharacterLength(8),
                    createMaxCharacterLength(255),
                    createPattern(/.*[a-z]/, i18n.t("Password should contain at least one lowercase letter")),
                    createPattern(/.*[A-Z]/, i18n.t("Password should contain at least one UPPERCASE letter")),
                    createPattern(/.*[0-9]/, i18n.t("Password should contain at least one number")),
                    createPattern(/[^A-Za-z0-9]/, i18n.t("Password should have at least one special character"))
                ),
            };
        case "phoneNumber":
            return {
                validation: createPattern(/^\+?[0-9 \-()]+$/, i18n.t("Please provide a valid phone number")),
            };
        case "whatsApp":
            return {
                validation: createPattern(
                    /^\+[0-9 ]+$/,
                    i18n.t("Please provide a valid international phone number (+0123456789)")
                ),
            };
        default: {
            const required = userRequiredFields.includes(field);
            return { validation: required ? hasValue : undefined };
        }
    }
};

export const RenderUserWizardField: React.FC<{ row: number; field: UserFormField }> = ({ row, field }) => {
    const { api, compositionRoot } = useAppContext();
    const { validation, props: validationProps = {} } = useValidations(field);
    const [locales, setLocales] = useState<Locale[]>([]);

    const name = `users[${row}].${field}`;
    const props = {
        name,
        placeholder: getUserFieldName(field),
        validate: validation,
        ...validationProps,
    };

    useEffect(() => {
        if (field !== "uiLocale" && field !== "dbLocale") return;

        compositionRoot.instance.getLocales(field).run(
            locales => setLocales(locales),
            error => console.error(error)
        );
    }, [field, compositionRoot]);

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
        // TODO: if externalAccessOnly disable password
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
                    // selected={}
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
        case "uiLocale":
        case "dbLocale":
            return (
                <FormField
                    {...props}
                    component={SingleSelectFieldFF}
                    options={locales.map(({ locale, name }) => ({ value: locale, label: name }))}
                />
            );
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
