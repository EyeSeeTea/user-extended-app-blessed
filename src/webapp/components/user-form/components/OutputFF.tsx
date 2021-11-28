import { FieldState, SingleSelectField, SingleSelectOption } from "@dhis2/ui";
import _ from "lodash";
import React, { useCallback } from "react";
import { useField } from "react-final-form";
import styled from "styled-components";
import { NamedRef } from "../../../../domain/entities/Ref";
import i18n from "../../../../locales";
import { useAppContext } from "../../../contexts/app-context";
import { useFuture } from "../../../hooks/useFuture";
import { getPredictorFieldName } from "../utils";

export const OutputFF: React.FC<CategoryOptionComboFFProps> = ({ input, optionComboField }) => {
    const { compositionRoot } = useAppContext();
    const { input: optionComboInput } = useField(optionComboField);

    /*const { data: dataElements = [] } = useFuture(
        () =>
            compositionRoot.metadata
                .list(
                    "dataElements",
                    { paging: false },
                    { id: true, name: true, categoryCombo: { categoryOptionCombos: { id: true, name: true } } }
                )
                .map(({ objects }) => buildOptions(objects as unknown as DataElementWithCategoryOptionCombo[])),
        []
    );*/
    const dataElements = [{ label: "test1", value: "test1" }];

    const onChangeDataElement = useCallback(
        ({ selected }) => {
            const dataElement = dataElements.find(item => item.value === selected);
            if (dataElement) {
                input.onChange({ id: dataElement.value, name: dataElement.label });
                /*const categoryOption = dataElement.categoryOptions[0];
                optionComboInput.onChange(
                    categoryOption ? { id: categoryOption.value, name: categoryOption.label } : undefined
                );*/
            }
        },
        [dataElements, input, optionComboInput]
    );

    //categoryOptions: []
    const dataElementItems = _.unionBy(
        dataElements,
        [{ value: input.value.id, label: i18n.t("Invalid option") }],
        ({ value }) => value
    );

    /*const categoryItems = _.unionBy(
        dataElements.find(({ value }) => value === input.value.id)?.categoryOptions,
        [{ value: optionComboInput.value.id, label: i18n.t("Invalid option") }],
        ({ value }) => value
    );*/
    /*
        {categoryItems.map(({ value, label }) => (
                        <SingleSelectOption value={value} label={label} key={value} />
                    ))}
    */
    return (
        <React.Fragment>
            <SingleSelectField onChange={onChangeDataElement} selected={input.value.id} filterable={true}>
                {dataElementItems.map(({ value, label }) => (
                    <SingleSelectOption value={value} label={label} key={value} />
                ))}
            </SingleSelectField>
        </React.Fragment>
    );
};

export interface CategoryOptionComboFFProps {
    input: any;
    meta: FieldState<NamedRef>;
    optionComboField: string;
}

type DataElementWithCategoryOptionCombo = {
    id: string;
    name: string;
    categoryCombo: { categoryOptionCombos: { id: string; name: string }[] };
};

const buildOptions = (
    dataElements: DataElementWithCategoryOptionCombo[]
): { label: string; value: string; categoryOptions: { label: string; value: string }[] }[] => {
    return dataElements.map(({ id, name, categoryCombo }) => ({
        value: id,
        label: name,
        categoryOptions: categoryCombo.categoryOptionCombos.map(({ id, name }) => ({ value: id, label: name })),
    }));
};

const Row = styled.div`
    margin: 20px 0;
`;
