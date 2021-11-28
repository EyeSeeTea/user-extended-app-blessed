import React from "react";
import { TransferOption } from "@dhis2/ui";
import { OrgUnitsSelector } from "@eyeseetea/d2-ui-components";
import { NamedRef } from "../../../../domain/entities/Ref";
import { useAppContext } from "../../../contexts/app-context";
import { useFuture } from "../../../hooks/useFuture";
import { TransferFF, TransferFFProps } from "../../form/fields/TransferFF";
import { D2ModelSchemas } from "@eyeseetea/d2-api/2.34";

export interface OrgUnitFFProps extends TransferFFProps {
    modelType: keyof D2ModelSchemas;
}
export const OrgUnitLevelsFF: React.FC<Omit<OrgUnitFFProps, "options">> = props => {
    const { compositionRoot, api } = useAppContext();
    //buildTransferOptions(objects)
    const { data: orgUnitLevels = [] } = useFuture(
        () => compositionRoot.metadata.list(props.modelType).map(({ objects }) => buildTransferOptions(objects)),
        []
    );
    console.log(orgUnitLevels);

    return (
        <React.Fragment>
            <OrgUnitsSelector
                    api={api}
                    selected={this.state.selected}
                    onChange={this.onChange}
                    controls={{
                        filterByLevel: true,
                        filterByGroup: true,
                        filterByProgram: false,
                        selectAll: false,
                    }}
                />
            <TransferFF
                {...props}
                filterable
                filterablePicked
                selectedWidth="100%"
                optionsWidth="100%"
                options={orgUnitLevels}
            />
            
        </React.Fragment>
    );
};
interface OptionType extends NamedRef {
    authorities?: string[];
}
const buildTransferOptions = (options: NamedRef[]): TransferOption[] => {
    console.log(options);
    return options.map(({ id, name }) => ({ value: id, label: name }));
};
