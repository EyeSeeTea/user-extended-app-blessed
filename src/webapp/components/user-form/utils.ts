import _ from "lodash";
import i18n from "../../../locales";

export type UserFormField = typeof userFormFields[number];

export const userFormFields = [
    "id",
    "firstName",
    "surname",
    "name",
    "email",
    "username",
    "disabled",
    "openId",
    "apiUrl",
    "dataViewOrganisationUnits",
    "organisationUnits",
    "userGroups",
    "userRoles",
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
        case "surname":
            return i18n.t("Surname");
        case "username":
            return i18n.t("Username");
        case "email":
            return i18n.t("Email");
        case "disabled":
            return i18n.t("Disabled");
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
        case "apiUrl":
            return i18n.t("Api URL");
    }
};

export const getUserFieldName = (field: UserFormField) => {
    const name = getUserName(field);
    const required = userRequiredFields.includes(field);
    return _.compact([name, required ? "(*)" : undefined]).join(" ");
};
