import { FieldState, NoticeBox } from "@dhis2/ui";
import { OrgUnitsSelector } from "@eyeseetea/d2-ui-components";
import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { NamedRef } from "../../../../domain/entities/Ref";
import { useAppContext } from "../../../contexts/app-context";

export type OrgUnitSelectorFFProps = {
    input: any;
    meta: FieldState<NamedRef[]>;
    error?: boolean;
    loading?: boolean;
    showLoadingStatus?: boolean;
    showValidStatus?: boolean;
    valid?: boolean;
    validationText?: string;
};

export const OrgUnitSelectorFF = ({ input, meta, validationText, ...rest }: OrgUnitSelectorFFProps) => {
    const { api, compositionRoot } = useAppContext();

    const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
    const message = validationText ?? meta.error ?? meta.submitError;

    const onChange = useCallback(
        (selected: string[]) => {
            const selectedIds = selected.flatMap(item => item.split("/").at(-1) ?? []);
            input.onChange(selectedIds.map(id => ({ id })));
        },
        [input]
    );

    useEffect(() => {
        const ids = input.value.map(({ id }: NamedRef) => id);
        compositionRoot.metadata.getOrgUnitPaths(ids).run(
            items => setSelectedPaths(items.map(({ path }) => path)),
            error => console.error(error)
        );
    }, [input.value, compositionRoot]);

    return (
        <React.Fragment>
            <OrgUnitsSelector
                {...rest}
                api={api}
                onChange={onChange}
                selected={selectedPaths}
                controls={{
                    filterByLevel: true,
                    filterByGroup: true,
                    filterByProgram: false,
                    selectAll: false,
                }}
                showNameSetting={true}
            />

            {!!message && <WarningBox warning={true} title={message} />}
        </React.Fragment>
    );
};

const WarningBox = styled(NoticeBox)`
    margin-top: 20px;
    align-items: center;

    h6 {
        margin: 0px;
    }
`;
