import { TransferOption } from "@dhis2/ui";
import { NamedRef } from "../../../../domain/entities/Ref";
import { useAppContext } from "../../../contexts/app-context";
import { useFuture } from "../../../hooks/useFuture";
import { TransferFF, TransferFFProps } from "../../form/fields/TransferFF";

export const OrgUnitLevelsFF: React.FC<Omit<TransferFFProps, "options">> = props => {
    const { compositionRoot } = useAppContext();

    /*const { data: orgUnitLevels = [] } = useFuture(
        () =>
            compositionRoot.metadata.list("organisationUnitLevels").map(({ objects }) => buildTransferOptions(objects)),
        []
    );*/
    const options1 = [{label: "test1", value: "test1"}]

    return (
        <TransferFF
            {...props}
            filterable
            filterablePicked
            selectedWidth="100%"
            optionsWidth="100%"
            options={options1}
        />
    );
};

const buildTransferOptions = (options: NamedRef[]): TransferOption[] => {
    return options.map(({ id, name }) => ({ value: id, label: name }));
};
