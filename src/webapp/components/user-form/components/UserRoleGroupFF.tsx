import React from "react";
import { TransferOption } from "@dhis2/ui";
import { NamedRef } from "../../../../domain/entities/Ref";
import { useAppContext } from "../../../contexts/app-context";
import { useFuture } from "../../../hooks/useFuture";
import { TransferFF, TransferFFProps } from "../../form/fields/TransferFF";
import { D2ModelSchemas } from "@eyeseetea/d2-api/2.34";

export interface UserRoleGroupFFProps extends TransferFFProps {
    modelType: keyof D2ModelSchemas;
}
export const UserRoleGroupFF: React.FC<Omit<UserRoleGroupFFProps, "options">> = props => {
    const { compositionRoot } = useAppContext();
    const { data: userRoleGroups = [] } = useFuture(
        () => compositionRoot.metadata.list(props.modelType).map(({ objects }) => buildTransferOptions(objects)),
        []
    );

    return (
        <React.Fragment>
            <TransferFF
                {...props}
                filterable
                filterablePicked
                selectedWidth="100%"
                optionsWidth="100%"
                options={userRoleGroups}
            />
        </React.Fragment>
    );
};

const buildTransferOptions = (options: NamedRef[]): TransferOption[] => {
    return options.map(({ id, name }) => ({ value: id, label: name }));
};
