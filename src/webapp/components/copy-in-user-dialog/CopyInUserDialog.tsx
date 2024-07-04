import React from "react";
import i18n from "../../../locales";
import _ from "lodash";
import { User } from "../../../domain/entities/User";
import { Id } from "../../../domain/entities/Ref";
import { AccessElements, AccessElementsKeys, UpdateStrategy } from "../../../domain/repositories/UserRepository";
import { Toggle } from "material-ui";
import { Box } from "@material-ui/core";
import styled from "styled-components";
import { SegmentedControl, Transfer } from "@dhis2/ui";
import { ConfirmationDialog, useSnackbar } from "@eyeseetea/d2-ui-components";

export const CopyInUserDialog: React.FC<CopyInUserDialogProps> = props => {
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

    const copyInUserTitle = i18n.t("Copy in user: {{user}}", {
        user: user.username,
        nsSeparator: false,
    });

    const getOptions = (): Array<{ value: Id; label: string }> => {
        return _(usersList)
            .reject({ id: user.id }) // Remove user source from target users
            .map(({ id, name, username }) => ({
                label: `${name} (${username})`,
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
                <Label>{i18n.t("Bulk update strategy: ", { nsSeparator: false })}</Label>

                <SegmentedControl
                    options={[
                        {
                            label: i18n.t("Merge"),
                            value: "merge",
                        },
                        {
                            label: i18n.t("Replace"),
                            value: "replace",
                        },
                    ]}
                    selected={updateStrategy}
                    onChange={({ value }) => setUpdateStrategy(value ?? "merge")}
                />
            </Container>

            <Transfer
                options={getOptions()}
                selected={selectedUsersIds}
                onChange={({ selected }) => {
                    setSelectedUsersIds(selected);
                }}
                filterable={true}
                filterablePicked={true}
                filterPlaceholder={i18n.t("Search")}
                filterPlaceholderPicked={i18n.t("Search")}
                selectedWidth="100%"
                optionsWidth="100%"
                height="400px"
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
    display: flex;
    justify-content: right;
    margin-block-end: 1em;
    align-items: center;
`;

const Label = styled.span`
    margin-inline-end: 1em;
    font-weight: bold;
`;

const ToggleContainer = styled.div`
    margin-block-start: 3em;
    margin-inline-end: 1em;
`;
