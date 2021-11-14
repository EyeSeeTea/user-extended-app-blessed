import _ from "lodash";
import i18n from "../../../locales";

export type PredictorFormField = typeof predictorFormFields[number];

export const predictorFormFields = [
    "id",
    "firstName",
    "surname",
    "name",
    "email",
    "username",
    "disabled"

];

export const predictorRequiredFields: PredictorFormField[] = ["id","name"];

export const getPredictorName = (field: PredictorFormField) => {
    switch (field) {
        case "id":
            return i18n.t("Identifier");
        case "code":
            return i18n.t("Code");
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
        case "output":
            return i18n.t("Output data element");
        case "outputCombo":
            return i18n.t("Output category combo");
        case "organisationUnitLevels":
            return i18n.t("Organisation unit levels");
        case "predictorGroups":
            return i18n.t("Predictor groups");
    }
};

export const getPredictorFieldName = (field: PredictorFormField) => {
    const name = getPredictorName(field);
    const required = predictorRequiredFields.includes(field);
    return _.compact([name, required ? "(*)" : undefined]).join(" ");
};

export const missingValueStrategy = [
    { value: "SKIP_IF_ANY_VALUE_MISSING", label: i18n.t("Skip if any value is missing") },
    { value: "SKIP_IF_ALL_VALUES_MISSING", label: i18n.t("Skip if all values are missing") },
    { value: "NEVER_SKIP", label: i18n.t("Never skip") },
];
