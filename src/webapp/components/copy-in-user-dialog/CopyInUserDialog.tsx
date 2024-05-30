import React from "react";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";
import { User } from "../../../domain/entities/User";
import { Id } from "../../../domain/entities/Ref";
import { AccessElements, UpdateStrategy } from "../../../domain/repositories/UserRepository";
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
    });

    const getOptions = () => {
        // Remove user source from target users
        return _.reject(usersList, { value: user.id });
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

    const onToggleAccessElements = (_event: React.MouseEvent<HTMLInputElement>, newValue: boolean) => {
        setAccessElements({ ...accessElements, [_event.currentTarget.name]: newValue });
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
                    style={{ width: 280, float: "right", marginTop: 20, marginRight: 15 }}
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
    usersList: { text: string; value: Id }[];
};

const Container = styled.div`
    padding: 1em;
`;

const ToggleContainer = styled.div`
    margin-top: 3em;
    margin-right: 1em;
`;
