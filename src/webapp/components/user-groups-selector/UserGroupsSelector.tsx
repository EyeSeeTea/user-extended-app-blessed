import { useState, useEffect } from "react";
import { Transfer, TransferOption, SegmentedControl, SegmentedControlOption } from "@dhis2/ui";
import { ConfirmationDialog, useSnackbar } from "@eyeseetea/d2-ui-components";
import { NamedRef } from "../../../domain/entities/Ref";
import { User } from "../../../domain/entities/User";
import { Metadata } from "../../../domain/entities/Metadata";
import { UpdateStrategy } from "../../../domain/repositories/UserRepository";
import { useAppContext } from "../../contexts/app-context";
import { ellipsizedList } from "../../utils/list";
import i18n from "../../../locales";
import styled from "styled-components";
import _ from "lodash";

const oneUserOptions: SegmentedControlOption[] = [
    {
        label: i18n.t("Merge"),
        value: "merge",
        disabled: true,
    },
    {
        label: i18n.t("Replace"),
        value: "replace",
    },
];
const defaultOptions: SegmentedControlOption[] = [
    {
        label: i18n.t("Merge"),
        value: "merge",
    },
    {
        label: i18n.t("Replace"),
        value: "replace",
    },
];

export const UserGroupsSelector: React.FC<UserGroupsSelectorProps> = props => {
    const snackbar = useSnackbar();
    const { compositionRoot } = useAppContext();
    const { ids, onCancel, onSave } = props;
    const [users, setUsers] = useState([] as User[]);
    const [userGroups, setUserGroups] = useState([] as Metadata[]);
    const [transferOptions, setTransferOptions] = useState([] as TransferOption[]);
    const [selectedGroups, setSelectedGroups] = useState([""]);
    const [updateStrategy, setUpdateStrategy] = useState<UpdateStrategy>("merge");
    const [segmentedControlOptions, setSegmentedControlOptions] = useState<SegmentedControlOption[]>(defaultOptions);

    useEffect(() => {
        compositionRoot.metadata
            .list("userGroups")
            .map(({ objects }) => objects)
            .run(
                groups => {
                    setUserGroups(groups);
                    setTransferOptions(buildTransferOptions(groups));
                },
                error => snackbar.error(i18n.t("Error loading groups: ") + error)
            );
        compositionRoot.users.getMany(ids).run(
            users => {
                setUsers(users);
                setSelectedGroups(_.intersection(...users.map(user => user.userGroups.map(({ id }) => id))));
                setUpdateStrategy(users.length > 1 ? "merge" : "replace");
                setSegmentedControlOptions(users.length > 1 ? defaultOptions : oneUserOptions);
            },
            error => snackbar.error(i18n.t("Error loading users: ") + error)
        );
    }, [ids, compositionRoot.metadata, compositionRoot.users, snackbar]);

    return (
        <ConfirmationDialog
            isOpen={true}
            title={getTitle(users)}
            onCancel={onCancel}
            maxWidth={"lg"}
            fullWidth={true}
            onSave={() => {
                if (users.length > 0) {
                    compositionRoot.users
                        .updateGroups(
                            users,
                            userGroups.filter(group => selectedGroups.includes(group.id)),
                            updateStrategy
                        )
                        .run(
                            () => {
                                snackbar.success(i18n.t("User groups assigned."));
                                onSave();
                            },
                            error => snackbar.error(i18n.t("Error assigning user groups: ") + error)
                        );
                } else onCancel();
            }}
        >
            <Container>
                <Label>{i18n.t("Update strategy: ")}</Label>
                <SegmentedControl
                    options={segmentedControlOptions}
                    selected={updateStrategy}
                    onChange={data => setUpdateStrategy((data.value as UpdateStrategy) ?? "merge")}
                />
            </Container>
            <Transfer
                options={transferOptions}
                selected={selectedGroups}
                onChange={(payload: { selected: string[] }) => setSelectedGroups(payload.selected)}
                filterable={true}
                filterablePicked={true}
                filterPlaceholder={i18n.t("Search group")}
                filterPlaceholderPicked={i18n.t("Search group")}
                selectedWidth="100%"
                optionsWidth="100%"
                height="400px"
            />
        </ConfirmationDialog>
    );
};

const getTitle = (users: User[]): string => {
    const usernames = users && users.map(user => user.username);
    return i18n.t("Assign groups: ") + (usernames ? ellipsizedList(usernames) : "...");
};

const buildTransferOptions = (options: NamedRef[]): TransferOption[] => {
    return options.map(({ id, name }) => ({ value: id, label: name }));
};

const Container = styled.div`
    display: flex;
    justify-content: right;
    margin-bottom: 16px;
    align-items: center;
`;

const Label = styled.span`
    margin-right: 16px;
`;

export interface UserGroupsSelectorProps {
    ids: string[];
    onCancel: () => void;
    onSave: () => void;
}
