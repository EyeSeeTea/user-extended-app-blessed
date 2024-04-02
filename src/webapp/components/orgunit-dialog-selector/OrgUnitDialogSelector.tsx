import React from "react";
import { ConfirmationDialog, OrgUnitsSelector } from "@eyeseetea/d2-ui-components";
import { useAppContext } from "../../contexts/app-context";
import Toggle from "material-ui/Toggle";
import i18n from "../../../locales";
import { User } from "../../../domain/entities/User";
import { Id } from "../../../domain/entities/Ref";
import { extractIdsFromPaths } from "../../../domain/entities/OrgUnit";
import { UpdateStrategy } from "../../../domain/repositories/UserRepository";

function isThereOnlyOneUser(users: User[]): boolean {
    return users.length === 1;
}

function getOrgUnitPaths(users: User[]): string[] {
    return isThereOnlyOneUser(users) ? users.flatMap(user => user.organisationUnits.map(ou => ou.path)) : [];
}

export const OrgUnitDialogSelector: React.FC<OrgUnitDialogSelectorProps> = props => {
    const { onCancel, onSave, title, users, visible } = props;

    const onlyOneUser = isThereOnlyOneUser(users);

    const { api } = useAppContext();
    const [updateStrategy, setUpdateStrategy] = React.useState<UpdateStrategy>(onlyOneUser ? "replace" : "merge");
    const [selectedPaths, setPaths] = React.useState(getOrgUnitPaths(users));

    const onChangeOrgUnit = React.useCallback((paths: string[]) => {
        setPaths(paths);
    }, []);

    const onDialogSave = React.useCallback(() => {
        onSave(extractIdsFromPaths(selectedPaths), updateStrategy);
    }, [onSave, updateStrategy, selectedPaths]);

    const strategyLabel = updateStrategy === "replace" ? i18n.t("Replace") : i18n.t("Merge");

    return (
        <ConfirmationDialog
            open={visible}
            title={title}
            maxWidth="lg"
            fullWidth
            onCancel={onCancel}
            onSave={() => onDialogSave()}
        >
            {!onlyOneUser && (
                <Toggle
                    label={i18n.t("Bulk update strategy: {{strategy}}", {
                        strategy: strategyLabel,
                        nsSeparator: false,
                    })}
                    checked={updateStrategy === "replace"}
                    onToggle={(_, newValue) => setUpdateStrategy(newValue ? "replace" : "merge")}
                    style={{
                        width: 300,
                        float: "right",
                        marginTop: 20,
                        marginRight: 15,
                        marginBottom: -50,
                    }}
                />
            )}

            <OrgUnitsSelector
                api={api}
                selected={selectedPaths}
                onChange={onChangeOrgUnit}
                controls={{
                    filterByLevel: true,
                    filterByGroup: true,
                    filterByProgram: false,
                    selectAll: false,
                }}
                showNameSetting={true}
            />
        </ConfirmationDialog>
    );
};

type OrgUnitDialogSelectorProps = {
    onCancel: () => void;
    onSave: (orgUnitIds: Id[], strategy: UpdateStrategy) => void;
    title: string;
    users: User[];
    visible: boolean;
};
