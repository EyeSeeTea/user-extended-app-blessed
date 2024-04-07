import React from "react";
import styled from "styled-components";
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

const controls = {
    filterByLevel: true,
    filterByGroup: true,
    filterByProgram: false,
    selectAll: false,
};

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

    const onToggle = React.useCallback((_event, newValue: boolean) => {
        setUpdateStrategy(newValue ? "replace" : "merge");
    }, []);

    const isReplaceStrategy = updateStrategy === "replace";
    const strategyLabel = isReplaceStrategy ? i18n.t("Replace") : i18n.t("Merge");

    return (
        <ConfirmationDialog
            open={visible}
            title={title}
            maxWidth="lg"
            fullWidth
            onCancel={onCancel}
            onSave={onDialogSave}
        >
            <ToggleContainer $hide={onlyOneUser}>
                <ToggleStyle
                    label={i18n.t("Bulk update strategy: {{strategy}}", {
                        strategy: strategyLabel,
                        nsSeparator: false,
                    })}
                    toggled={isReplaceStrategy}
                    onToggle={onToggle}
                />
            </ToggleContainer>

            <div className="org-unit-dialog-selector">
                <OrgUnitsSelector
                    api={api}
                    selected={selectedPaths}
                    onChange={onChangeOrgUnit}
                    controls={controls}
                    showNameSetting={true}
                />
            </div>
        </ConfirmationDialog>
    );
};

export type OrgUnitDialogSelectorProps = {
    onCancel: () => void;
    onSave: (orgUnitIds: Id[], strategy: UpdateStrategy) => void;
    title: string;
    users: User[];
    visible: boolean;
};

const ToggleStyle = styled(Toggle)`
    margin-left: auto;
    width: initial !important;
`;

const ToggleContainer = styled.div<{ $hide: boolean }>`
    display: ${props => (props.$hide ? "none" : "flex")};
    padding: 1em;
`;
