import {
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
import React, { useEffect, useState } from "react";
import { useFormState } from "react-final-form";
import { Locale } from "../../../domain/entities/Locale";
import i18n from "../../../locales";
import { fullUidRegex } from "../../../utils/uid";
import { useAppContext } from "../../contexts/app-context";
import { FormField } from "../form/fields/FormField";
import { PreviewInputFF } from "../form/fields/PreviewInputFF";
import { OrgUnitSelectorFF } from "./components/OrgUnitSelectorFF";
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
        case "email":
            return {
                validation: createPattern(
                    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
                    i18n.t("Please provide a valid email")
                ),
            };
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

export const RenderUserWizardField: React.FC<{ row: number; field: UserFormField; isEdit: boolean }> = ({
    row,
    field,
    isEdit,
}) => {
    const { compositionRoot } = useAppContext();
    const { values } = useFormState();
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
        case "openId":
        case "ldapId":
            return <FormField {...props} component={InputFieldFF} />;
        case "username":
            return <FormField {...props} component={InputFieldFF} disabled={isEdit} />;
        case "password":
            return (
                <FormField
                    {...props}
                    component={InputFieldFF}
                    type="password"
                    disabled={values.users[row].externalAuth === true}
                />
            );
        // TODO: Convert to date field
        // case "accountExpiry":
        //     return <FormField {...props} component={InputFieldFF} type="datetime-local" />;
        case "userGroups":
            return <FormField {...props} component={UserRoleGroupFF} modelType="userGroups" />;
        case "userRoles":
            return <FormField {...props} component={UserRoleGroupFF} modelType="userRoles" />;
        case "organisationUnits":
        case "dataViewOrganisationUnits":
            return <FormField {...props} component={OrgUnitSelectorFF} />;
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

export const RenderUserImportField: React.FC<{ row: number; field: UserFormField; isEdit: boolean }> = ({
    row,
    field,
    isEdit,
}) => {
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
                    <RenderUserWizardField row={row} field={field} isEdit={isEdit} />
                </PreviewInputFF>
            );
        default:
            return <RenderUserWizardField row={row} field={field} isEdit={isEdit} />;
    }
};
