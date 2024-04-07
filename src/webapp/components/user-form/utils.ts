import _ from "lodash";
import i18n from "../../../locales";

export type UserFormField = typeof userFormFields[number];

export const userFormFields = [
    "id",
    "firstName",
    "surname",
    "password",
    "email",
    "username",
    "disabled",
    "externalAuth",
    "openId",
    "ldapId",
    "uiLocale",
    "dbLocale",
    "dataViewOrganisationUnits",
    "organisationUnits",
    "userGroups",
    "userRoles",
    "phoneNumber",
    "whatsApp",
    "facebookMessenger",
    "skype",
    "telegram",
    "twitter",
];

export const userRequiredFields: UserFormField[] = ["id", "name"];

export const getUserName = (field: UserFormField) => {
    switch (field) {
        case "id":
            return i18n.t("Identifier");
        case "firstName":
            return i18n.t("First Name");
        case "name":
            return i18n.t("Name");
        case "password":
            return i18n.t("Password");
        case "accountExpiry":
            return i18n.t("Account expiration date");
        case "surname":
            return i18n.t("Surname");
        case "username":
            return i18n.t("Username");
        case "email":
            return i18n.t("Email");
        case "phoneNumber":
            return i18n.t("Phone Number");
        case "whatsApp":
            return i18n.t("WhatsApp");
        case "facebookMessenger":
            return i18n.t("Facebook Messenger");
        case "skype":
            return i18n.t("Skype");
        case "telegram":
            return i18n.t("Telegram");
        case "twitter":
            return i18n.t("Twitter");
        case "disabled":
            return i18n.t("Disabled");
        case "externalAuth":
            return i18n.t("External authentication only (OpenID or LDAP)");
        case "userRoles":
            return i18n.t("User Roles");
        case "userGroups":
            return i18n.t("User Groups");
        case "organisationUnits":
            return i18n.t("Organisation Units");
        case "dataViewOrganisationUnits":
            return i18n.t("Data View Organisation Units");
        case "openId":
            return i18n.t("Open ID");
        case "ldapId":
            return i18n.t("LDAP identifier");
        case "uiLocale":
            return i18n.t("Interface language");
        case "dbLocale":
            return i18n.t("Database language");
        case "apiUrl":
            return i18n.t("Api URL");
    }
};

export const getUserFieldName = (field: UserFormField) => {
    const name = getUserName(field);
    const required = userRequiredFields.includes(field);
    return _.compact([name, required ? "(*)" : undefined]).join(" ");
};
