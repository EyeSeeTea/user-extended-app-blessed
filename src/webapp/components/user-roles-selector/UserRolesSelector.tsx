import { useState, useEffect } from "react";
import { Transfer, TransferOption, SegmentedControl, SegmentedControlOption } from "@dhis2/ui";
import { ConfirmationDialog, useSnackbar } from "@eyeseetea/d2-ui-components";
import { NamedRef } from "../../../domain/entities/Ref";
import { User } from "../../../domain/entities/User";
import { useAppContext } from "../../contexts/app-context";
import { ellipsizedList } from "../../utils/list";
import { Metadata } from "../../../domain/entities/Metadata";
import i18n from "../../../locales";
import styled from "styled-components";
import _, { update } from "lodash";

const updateStrategy = ["merge" as const, "replace" as const];

export type UpdateStrategy = typeof updateStrategy[number];

export const UserRolesSelector: React.FC<UserRolesSelectorProps> = props => {
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

    const snackbar = useSnackbar();
    const { compositionRoot } = useAppContext();
    const { ids, onCancel, onSave } = props;
    const [users, setUsers] = useState([] as User[]);
    const [userRoles, setUserRoles] = useState([] as Metadata[]);
    const [transferOptions, setTransferOptions] = useState([] as TransferOption[]);
    const [selectedRoles, setSelectedRoles] = useState([""]);
    const [updateStrategy, setUpdateStrategy] = useState<UpdateStrategy>("merge");
    const [segmentedControlOptions, setSegmentedControlOptions] = useState<SegmentedControlOption[]>(defaultOptions);

    useEffect(() => {
        compositionRoot.metadata
            .list("userRoles")
            .map(({ objects }) => objects)
            .run(
                roles => {
                    setUserRoles(roles);
                    setTransferOptions(buildTransferOptions(roles));
                },
                error => snackbar.error(i18n.t("Error loading roles: ") + error)
            );
        compositionRoot.users.getMany(ids).run(
            users => {
                setUsers(users);
                setSelectedRoles(_.intersection(...users.map(user => user.userRoles.map(({ id }) => id))));
                setUpdateStrategy(users.length > 1 ? "merge" : "replace");
                setSegmentedControlOptions(users.length > 1 ? defaultOptions : oneUserOptions);
            },
            error => snackbar.error(i18n.t("Error loading users: ") + error)
        );
    }, [ids]);

    return (
        <ConfirmationDialog
            isOpen={true}
            title={getTitle(users)}
            onCancel={onCancel}
            maxWidth={"lg"}
            fullWidth={true}
            onSave={() => {
                if (users.length > 0) {
                    switch (updateStrategy) {
                        case "replace":
                            setUsers(
                                users.map(user => {
                                    user.userRoles = userRoles.filter(role => selectedRoles.includes(role.id));
                                    return user;
                                })
                            );
                            break;
                        case "merge":
                            {
                                const removedRoles = _.intersection(
                                    ...users.map(user => user.userRoles.map(({ id }) => id))
                                ).filter(id => !selectedRoles.includes(id));
                                setUsers(
                                    users.map(user => {
                                        user.userRoles = _.union(
                                            user.userRoles.filter(role => !removedRoles.includes(role.id)),
                                            userRoles.filter(role => selectedRoles.includes(role.id))
                                        );
                                        return user;
                                    })
                                );
                            }
                            break;
                        default:
                            snackbar.error(i18n.t("Unknown strategy: ") + updateStrategy);
                            break;
                    }
                    compositionRoot.users.save(users).run(
                        () => {
                            snackbar.success(i18n.t("User roles assigned."));
                            setUsers([]);
                            onSave();
                        },
                        error => snackbar.error(i18n.t("Error assigning user roles: ") + error)
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
                selected={selectedRoles}
                onChange={(payload: { selected: string[] }) => setSelectedRoles(payload.selected)}
                filterable={true}
                filterablePicked={true}
                selectedWidth="100%"
                optionsWidth="100%"
                height="400px"
            />
        </ConfirmationDialog>
    );
};

const getTitle = (users: User[]): string => {
    const usernames = users && users.map(user => user.username);
    return i18n.t("Assign roles: ") + (usernames ? ellipsizedList(usernames) : "...");
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

export interface UserRolesSelectorProps {
    ids: string[];
    onCancel: () => void;
    onSave: () => void;
}
