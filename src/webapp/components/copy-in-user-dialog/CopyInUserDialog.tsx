import React from "react";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";
import { User } from "../../../domain/entities/User";
import { Id } from "../../../domain/entities/Ref";
import { AccessElements, UpdateStrategy } from "../../../domain/repositories/UserRepository";
import { ConfirmationDialog, MultiSelector } from "@eyeseetea/d2-ui-components";
import { TextField, Toggle } from "material-ui";
import { Box } from "@material-ui/core";
import styled from "styled-components";

export const CopyInUserDialog: React.FC<CopyInUserDialogProps> = props => {
    const { d2, compositionRoot } = useAppContext();
    const { onCancel, onSave, user, visible } = props;

    const [usersIdsAndInfos, setUsersIdsAndInfos] = React.useState<{ text: string; value: Id }[]>([]);
    const [selectedUsersIds, setSelectedUsersIds] = React.useState<Id[]>([]);
    const [searchText, setSearchText] = React.useState<string>("");
    const [updateStrategy, setUpdateStrategy] = React.useState<UpdateStrategy>("merge");
    const [accessElements, setAccessElements] = React.useState<AccessElements>({
        userGroups: false,
        userRoles: false,
        dataViewOrganisationUnits: false,
        organisationUnits: false,
    });

    const isReplaceStrategy = updateStrategy === "replace";
    const strategyLabel = isReplaceStrategy ? i18n.t("Replace") : i18n.t("Merge");
    const copyInUserTitle = i18n.t("Copy in user: {{user}}", {
        user: user.username,
    });

    const onDialogSave = React.useCallback(() => {
        onSave(selectedUsersIds, updateStrategy, accessElements);
    }, [onSave, selectedUsersIds, updateStrategy, accessElements]);

    const onToggleStrategy = React.useCallback((_event: React.MouseEvent<HTMLInputElement>, newValue: boolean) => {
        setUpdateStrategy(newValue ? "replace" : "merge");
    }, []);

    const onToggleAccessElements = (_event: React.MouseEvent<HTMLInputElement>, newValue: boolean) => {
        setAccessElements({ ...accessElements, [_event.currentTarget.name]: newValue });
    };

    React.useMemo(() => {
        const getUsersIdAndInfos = async (): Promise<void> => {
            try {
                const users = await compositionRoot.users.listAll({ search: searchText }).toPromise();
                const usersIdsAndInfosList = users.map(({ id, name, username }) => ({
                    text: `${name} (${username})`,
                    value: id,
                }));
                console.log({ usersIdsAndInfosList });
                setUsersIdsAndInfos(usersIdsAndInfosList);
            } catch (error) {
                console.error("Error fetching user info:", error);
            }
        };

        getUsersIdAndInfos();
    }, [compositionRoot, searchText]);

    return (
        <ConfirmationDialog
            title={copyInUserTitle}
            maxWidth="lg"
            fullWidth
            open={visible}
            onCancel={onCancel}
            onSave={onDialogSave}
        >
            <Container>
                <Box justifyContent="space-between">
                    <TextField
                        style={{ width: "initial" }}
                        value={searchText}
                        onChange={(e, value) => setSearchText(value)}
                        type="search"
                        hintText={i18n.t("Search by name")}
                    />
                    <Toggle
                        label={i18n.t("Bulk update strategy: {{strategy}}", {
                            strategy: strategyLabel,
                            nsSeparator: false,
                        })}
                        style={{ width: 280, float: "right", marginTop: 20, marginRight: 15 }}
                        toggled={isReplaceStrategy}
                        onToggle={onToggleStrategy}
                    />
                </Box>
                <MultiSelector
                    d2={d2}
                    height={300}
                    onChange={setSelectedUsersIds}
                    options={usersIdsAndInfos}
                    ordered={false}
                />
                <Box display="flex">
                    <ToggleContainer>
                        <Toggle
                            label={i18n.t("User Groups")}
                            toggled={accessElements.userGroups}
                            name="userGroups"
                            onToggle={onToggleAccessElements}
                        />
                        <Toggle
                            label={i18n.t("OU Outputs")}
                            toggled={accessElements.dataViewOrganisationUnits}
                            name="dataViewOrganisationUnits"
                            onToggle={onToggleAccessElements}
                        />
                    </ToggleContainer>
                    <ToggleContainer>
                        <Toggle
                            label={i18n.t("User Roles")}
                            toggled={accessElements.userRoles}
                            name="userRoles"
                            onToggle={onToggleAccessElements}
                        />
                        <Toggle
                            label={i18n.t("OU Capture")}
                            toggled={accessElements.organisationUnits}
                            name="organisationUnits"
                            onToggle={onToggleAccessElements}
                        />
                    </ToggleContainer>
                </Box>
            </Container>
        </ConfirmationDialog>
    );
};

export type CopyInUserDialogProps = {
    onCancel: () => void;
    onSave: (selectedUsersIds: Id[], updateStrategy: UpdateStrategy, accessElements: AccessElements) => void;
    user: User;
    visible: boolean;
};

const Container = styled.div`
    padding: 1em;
`;

const ToggleContainer = styled.div`
    margin-top: 3em;
    margin-right: 1em;
`;
