import _ from "lodash";
import { FieldState, NoticeBox } from "@dhis2/ui";
import { OrgUnitsSelector } from "@eyeseetea/d2-ui-components";
import React from "react";
import styled from "styled-components";
import { NamedRef } from "../../../../domain/entities/Ref";
import { joinPaths, orgUnitControls, orgUnitListParams } from "../../../../utils/d2-api";
import { useAppContext } from "../../../contexts/app-context";
import { OrgUnit } from "../../../../domain/entities/OrgUnit";
import { Maybe } from "../../../../types/utils";

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

    const [selectedPaths, setSelectedPaths] = React.useState<string[]>([]);
    const message = validationText ?? meta.error ?? meta.submitError;

    const onChange = React.useCallback(
        (selected: string[]) => {
            const selectedIds = selected.flatMap(item => item.split("/").at(-1) ?? []);
            return compositionRoot.metadata.getOrgUnitPaths(selectedIds).run(
                orgUnits => {
                    input.onChange(
                        _(selectedIds)
                            .map((id): Maybe<OrgUnit> => {
                                const orgUnitDetails = orgUnits.find(orgUnit => orgUnit.id === id);
                                if (!orgUnitDetails) return undefined;
                                return orgUnitDetails;
                            })
                            .compact()
                            .value()
                    );
                },
                error => console.error(error)
            );
        },
        [compositionRoot.metadata, input]
    );

    React.useEffect(() => {
        const ids = input.value.map(({ id }: NamedRef) => id);
        return compositionRoot.metadata.getOrgUnitPaths(ids).run(
            items => {
                setSelectedPaths(items.map(orgUnit => joinPaths(orgUnit)));
            },
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
                controls={orgUnitControls}
                listParams={orgUnitListParams}
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
