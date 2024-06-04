import React from "react";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";
import { User } from "../../../domain/entities/User";
import { Id } from "../../../domain/entities/Ref";
import { AccessElements, AccessElementsKeys, UpdateStrategy } from "../../../domain/repositories/UserRepository";
import { ConfirmationDialog, MultiSelector } from "@eyeseetea/d2-ui-components";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { Toggle } from "material-ui";
import { Box, makeStyles } from "@material-ui/core";
import styled from "styled-components";
import _ from "lodash";

export const CopyInUserDialog: React.FC<CopyInUserDialogProps> = props => {
    const { d2 } = useAppContext();
    const { onCancel, onSave, user, visible, usersList } = props;

    const [selectedUsersIds, setSelectedUsersIds] = React.useState<Id[]>([]);
    const [updateStrategy, setUpdateStrategy] = React.useState<UpdateStrategy>("merge");
    const [accessElements, setAccessElements] = React.useState<AccessElements>({
        userGroups: false,
        userRoles: false,
        dataViewOrganisationUnits: false,
        organisationUnits: false,
    });

    const snackbar = useSnackbar();

    // Overide TextInput width in MultiSelector
    const useStyles = makeStyles(() => ({
        searchFieldOverride: {
            width: "initial",
        },
    }));

    const isReplaceStrategy = updateStrategy === "replace";
    const strategyLabel = isReplaceStrategy ? i18n.t("Replace") : i18n.t("Merge");
    const copyInUserTitle = i18n.t("Copy in user: {{user}}", {
        user: user.username,
        nsSeparator: false,
    });

    const getOptions = (): Array<{ value: Id; text: string }> => {
        return _(usersList)
            .reject({ id: user.id }) // Remove user source from target users
            .map(({ id, name, username }) => ({
                text: `${name} (${username})`,
                value: id,
            }))
            .value();
    };

    const onDialogSave = React.useCallback(() => {
        // Make sure one accessElements property is truthful
        if (_.every(accessElements, value => value === false)) {
            snackbar.error(i18n.t("Select one toggle"));
        } else if (_.isEmpty(selectedUsersIds)) {
            snackbar.error(i18n.t("Select at least one user"));
        } else {
            onSave(selectedUsersIds, updateStrategy, accessElements);
        }
    }, [onSave, selectedUsersIds, updateStrategy, accessElements, snackbar]);

    const onToggleStrategy = React.useCallback((_event: React.MouseEvent<HTMLInputElement>, newValue: boolean) => {
        setUpdateStrategy(newValue ? "replace" : "merge");
    }, []);

    const onToggleAccessElements = (property: AccessElementsKeys, value: boolean) => {
        setAccessElements({ ...accessElements, [property]: value });
    };

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
                <Toggle
                    label={i18n.t("Bulk update strategy: {{strategy}}", {
                        strategy: strategyLabel,
                        nsSeparator: false,
                    })}
                    style={{ width: 280, float: "inline-end", marginBlockStart: 20, marginInlineStart: 15 }}
                    toggled={isReplaceStrategy}
                    onToggle={onToggleStrategy}
                />
                <MultiSelector
                    d2={d2}
                    height={300}
                    onChange={setSelectedUsersIds}
                    options={getOptions()}
                    ordered={false}
                    searchFilterLabel={i18n.t("Search by name")}
                    classes={{
                        searchField: useStyles().searchFieldOverride,
                    }}
                />
                <Box display="flex">
                    <ToggleContainer>
                        <Toggle
                            label={i18n.t("User Groups")}
                            toggled={accessElements.userGroups}
                            onToggle={(_, value) => onToggleAccessElements("userGroups", value)}
                        />
                        <Toggle
                            label={i18n.t("OU Outputs")}
                            toggled={accessElements.dataViewOrganisationUnits}
                            onToggle={(_, value) => onToggleAccessElements("dataViewOrganisationUnits", value)}
                        />
                    </ToggleContainer>
                    <ToggleContainer>
                        <Toggle
                            label={i18n.t("User Roles")}
                            toggled={accessElements.userRoles}
                            onToggle={(_, value) => onToggleAccessElements("userRoles", value)}
                        />
                        <Toggle
                            label={i18n.t("OU Capture")}
                            toggled={accessElements.organisationUnits}
                            onToggle={(_, value) => onToggleAccessElements("organisationUnits", value)}
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
    usersList: User[];
};

const Container = styled.div`
    padding: 1em;
`;

const ToggleContainer = styled.div`
    margin-block-start: 3em;
    margin-inline-end: 1em;
`;
