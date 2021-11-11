import _ from "lodash";
import i18n from "../../../locales";

export type PredictorFormField = typeof predictorFormFields[number];

export const predictorFormFields = [
    "id",
    "code",
    "name",
    "description",
    "output",
    "periodType",
    "annualSampleCount",
    "sequentialSampleCount",
    "organisationUnitLevels",
    "predictorGroups",
    "sequentialSkipCount",
    "generator.description",
    "generator.expression",
    "generator.missingValueStrategy",
    "sampleSkipTest.description",
    "sampleSkipTest.expression",
    "scheduling.sequence",
    "scheduling.variable",
];

export const predictorRequiredFields: PredictorFormField[] = ["name", "generator.expression", "output", "outputCombo"];

export const getPredictorName = (field: PredictorFormField) => {
    switch (field) {
        case "id":
            return i18n.t("Identifier");
        case "code":
            return i18n.t("Code");
        case "name":
            return i18n.t("Name");
        case "description":
            return i18n.t("Description");
        case "output":
            return i18n.t("Output data element");
        case "outputCombo":
            return i18n.t("Output category combo");
        case "periodType":
            return i18n.t("Period type");
        case "annualSampleCount":
            return i18n.t("Annual sample count");
        case "sequentialSampleCount":
            return i18n.t("Sequential sample count");
        case "sequentialSkipCount":
            return i18n.t("Sequential skip count");
        case "organisationUnitLevels":
            return i18n.t("Organisation unit levels");
        case "predictorGroups":
            return i18n.t("Predictor groups");
        case "generator.description":
            return i18n.t("Generator description");
        case "generator.missingValueStrategy":
            return i18n.t("Missing value strategy");
        case "generator.expression":
            return i18n.t("Generator formula");
        case "sampleSkipTest.description":
            return i18n.t("Sample skip test description");
        case "sampleSkipTest.expression":
            return i18n.t("Sample skip test formula");
        case "scheduling.sequence":
            return i18n.t("Sequence");
        case "scheduling.variable":
            return i18n.t("Variable");
    }
};

export const getPredictorFieldName = (field: PredictorFormField) => {
    const name = getPredictorName(field);
    const required = predictorRequiredFields.includes(field);
    return _.compact([name, required ? "(*)" : undefined]).join(" ");
};

export const periodTypes = [
    { value: "Daily", label: i18n.t("Daily") },
    { value: "Weekly", label: i18n.t("Weekly") },
    { value: "WeeklyWednesday", label: i18n.t("Weekly starting Wednesday") },
    { value: "WeeklyThursday", label: i18n.t("Weekly starting Thursday") },
    { value: "WeeklySaturday", label: i18n.t("Weekly starting Saturday") },
    { value: "WeeklySunday", label: i18n.t("Weekly starting Sunday") },
    { value: "BiWeekly", label: i18n.t("Biweekly") },
    { value: "Monthly", label: i18n.t("Monthly") },
    { value: "BiMonthly", label: i18n.t("Bi-monthly") },
    { value: "Quarterly", label: i18n.t("Quarterly") },
    { value: "SixMonthly", label: i18n.t("Six-monthly") },
    { value: "SixMonthlyApril", label: i18n.t("Six-monthly starting April") },
    { value: "SixMonthlyNov", label: i18n.t("Six-monthly starting November") },
    { value: "Yearly", label: i18n.t("Yearly") },
    { value: "FinancialApril", label: i18n.t("Financial year starting April") },
    { value: "FinancialJuly", label: i18n.t("Financial year starting July") },
    { value: "FinancialOct", label: i18n.t("Financial year starting October") },
    { value: "FinancialNov", label: i18n.t("Financial year starting November") },
];

export const missingValueStrategy = [
    { value: "SKIP_IF_ANY_VALUE_MISSING", label: i18n.t("Skip if any value is missing") },
    { value: "SKIP_IF_ALL_VALUES_MISSING", label: i18n.t("Skip if all values are missing") },
    { value: "NEVER_SKIP", label: i18n.t("Never skip") },
];
