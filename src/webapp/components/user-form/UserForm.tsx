import {
    composeValidators,
    createMaxCharacterLength,
    createMinNumber,
    createPattern,
    FieldState,
    hasValue,
    InputFieldFF,
    integer,
    SingleSelectFieldFF,
} from "@dhis2/ui";
import React from "react";
import i18n from "../../../locales";
import { fullUidRegex } from "../../../utils/uid";
import { FormField } from "../form/fields/FormField";
import { NumberInputFF } from "../form/fields/NumberInputFF";
import { PreviewInputFF } from "../form/fields/PreviewInputFF";
import { OrgUnitLevelsFF } from "./components/OrgUnitLevelsFF";
//import { OutputFF } from "./components/OutputFF";
import {
    getPredictorFieldName,
    missingValueStrategy,
    periodTypes,
    PredictorFormField,
    predictorRequiredFields,
} from "./utils";

const useValidations = (field: PredictorFormField): { validation?: (...args: any[]) => any; props?: object } => {
    switch (field) {
        case "id":
            return { validation: createPattern(fullUidRegex, i18n.t("Please provide a valid identifier")) };
        case "description":
        case "generator.description":
        case "sampleSkipTest.description":
            return { validation: createMaxCharacterLength(255) };
        case "sequentialSampleCount":
        case "annualSampleCount":
        case "sequentialSkipCount":
        case "scheduling.sequence":
        case "scheduling.variable":
            return { validation: composeValidators(integer, createMinNumber(0)) };
        default: {
            const required = predictorRequiredFields.includes(field);
            return { validation: required ? hasValue : undefined };
        }
    }
};

export const RenderPredictorWizardField: React.FC<{ row: number; field: PredictorFormField }> = ({ row, field }) => {
    const name = `predictors[${row}.${field}]`;
    const { validation, props: validationProps = {} } = useValidations(field);
    const props = {
        name,
        placeholder: getPredictorFieldName(field),
        validate: validation,
        ...validationProps,
    };
    /*
        case "output":
            return <FormField {...props} component={OutputFF} optionComboField={`predictors[${row}.outputCombo]`} />;
*/
    switch (field) {
        case "id":
        case "code":
        case "description":
        case "name":
        case "generator.description":
        case "sampleSkipTest.description":
            return <FormField {...props} component={InputFieldFF} />;
        case "periodType":
            return <FormField {...props} component={SingleSelectFieldFF} options={periodTypes} />;
        case "organisationUnitLevels":
            return <FormField {...props} component={OrgUnitLevelsFF} />;
        case "generator.missingValueStrategy":
            return <FormField {...props} component={SingleSelectFieldFF} options={missingValueStrategy} />;
        case "sequentialSampleCount":
        case "annualSampleCount":
        case "sequentialSkipCount":
        case "scheduling.sequence":
        case "scheduling.variable":
            return <FormField {...props} component={NumberInputFF} defaultValue="0" min="0" />;
        default:
            return null;
    }
};

export const RenderPredictorImportField: React.FC<{ row: number; field: PredictorFormField }> = ({ row, field }) => {
    const name = `predictors[${row}.${field}]`;
    const { validation, props: validationProps = {} } = useValidations(field);

    const props = {
        name,
        placeholder: getPredictorFieldName(field),
        validate: validation,
        ...validationProps,
    };

    switch (field) {
        case "organisationUnitLevels":
        case "predictorGroups":
        case "generator.expression":
        case "sampleSkipTest.expression":
        case "output":
            return (
                <PreviewInputFF {...props}>
                    <RenderPredictorWizardField row={row} field={field} />
                </PreviewInputFF>
            );
        default:
            return <RenderPredictorWizardField row={row} field={field} />;
    }
};
