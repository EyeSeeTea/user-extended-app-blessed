import _ from "lodash";
import i18n from "../../../locales";

export type UserFormField = typeof userFormFields[number];

// Warning: will afect bulk-edit
export const userFormFields = [
    "id",
    "firstName",
    "surname",
    "name",
    "password",
    "accountExpiry",
    "email",
    "phoneNumber",
    "whatsApp",
    "facebookMessenger",
    "skype",
    "telegram",
    "twitter",
    "username",
    "disabled",
    "externalAuth",
    "openId",
    "ldapId",
    "uiLocale",
    "dbLocale",
    "apiUrl",
    "dataViewOrganisationUnits",
    "organisationUnits",
    "userGroups",
    "userRoles",
];

// TODO: Temporal for form testing, should be retrieved programaticly from the api
export const uiLocaleFields = [
    { value: "ar", label: i18n.t("Arabic") },
    { value: "ar_EG", label: i18n.t("Arabic (Egypt)") },
    { value: "ar_IQ", label: i18n.t("Arabic (Iraq)") },
    { value: "ar_SD", label: i18n.t("Arabic (Sudan)") },
    { value: "bn", label: i18n.t("Bengali") },
    { value: "bi", label: i18n.t("Bislama") },
    { value: "my", label: i18n.t("Burmese") },
    { value: "zh", label: i18n.t("Chinese") },
    { value: "zh_CN", label: i18n.t("Chinese (China)") },
    { value: "cs", label: i18n.t("Czech") },
    { value: "da", label: i18n.t("Danish") },
    { value: "en", label: i18n.t("English") },
    { value: "fr", label: i18n.t("French") },
    { value: "in", label: i18n.t("Indonesian") },
    { value: "in_ID", label: i18n.t("Indonesian (Indonesia)") },
    { value: "km", label: i18n.t("Khmer") },
    { value: "rw", label: i18n.t("Kinyarwanda") },
    { value: "lo", label: i18n.t("Lao") },
    { value: "mn", label: i18n.t("Mongolian") },
    { value: "ne", label: i18n.t("Nepali") },
    { value: "nb", label: i18n.t("Norwegian Bokmål") },
    { value: "pt", label: i18n.t("Portuguese") },
    { value: "pt_BR", label: i18n.t("Portuguese (Brazil)") },
    { value: "ps", label: i18n.t("Pushto") },
    { value: "ru", label: i18n.t("Russian") },
    { value: "es", label: i18n.t("Spanish") },
    { value: "sv", label: i18n.t("Swedish") },
    { value: "tg", label: i18n.t("Tajik") },
    { value: "tet", label: i18n.t("Tetum") },
    { value: "uk", label: i18n.t("Ukrainian") },
    { value: "ur", label: i18n.t("Urdu") },
    { value: "uz", label: i18n.t("Uzbek") },
    { value: "vi", label: i18n.t("Vietnamese") },
    { value: "ckb", label: i18n.t("ckb") },
    { value: "prs", label: i18n.t("prs") },
];

export const dbLocaleFields = [
    { value: "af", label: i18n.t("Afrikaans") },
    { value: "am", label: i18n.t("Amharic") },
    { value: "ar", label: i18n.t("Arabic") },
    { value: "bi", label: i18n.t("Bislama") },
    { value: "my", label: i18n.t("Burmese") },
    { value: "zh", label: i18n.t("Chinese") },
    { value: "nl", label: i18n.t("Dutch") },
    { value: "dz", label: i18n.t("Dzongkha") },
    { value: "en", label: i18n.t("English") },
    { value: "en_BW", label: i18n.t("English (Botswana)") },
    { value: "en_KH", label: i18n.t("English (Cambodia)") },
    { value: "en_TZ", label: i18n.t("English (Tanzania)") },
    { value: "en_UG", label: i18n.t("English (Uganda)") },
    { value: "fr", label: i18n.t("French") },
    { value: "fr_SN", label: i18n.t("French (Senegal)") },
    { value: "fr_SN", label: i18n.t("French (Senegal)") },
    { value: "de", label: i18n.t("German") },
    { value: "gu", label: i18n.t("Gujarati") },
    { value: "hi", label: i18n.t("Hindi") },
    { value: "in", label: i18n.t("Indonesian") },
    { value: "it", label: i18n.t("Italian") },
    { value: "km", label: i18n.t("Khmer") },
    { value: "rw", label: i18n.t("Kinyarwanda") },
    { value: "lo", label: i18n.t("Lao") },
    { value: "ne", label: i18n.t("Nepali") },
    { value: "no", label: i18n.t("Norwegian") },
    { value: "fa", label: i18n.t("Persian") },
    { value: "pt", label: i18n.t("Portuguese") },
    { value: "ps", label: i18n.t("Pushto") },
    { value: "ru", label: i18n.t("Russian") },
    { value: "es", label: i18n.t("Spanish") },
    { value: "es_GT", label: i18n.t("Spanish (Guatemala)") },
    { value: "es_MX", label: i18n.t("Spanish (Mexico)") },
    { value: "sw", label: i18n.t("Swahili") },
    { value: "tg", label: i18n.t("Tajik") },
    { value: "vi", label: i18n.t("Vietnamese") },
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
