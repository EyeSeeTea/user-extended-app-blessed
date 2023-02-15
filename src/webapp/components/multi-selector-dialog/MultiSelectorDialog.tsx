import { SegmentedControl, Transfer, TransferOption } from "@dhis2/ui";
import { ConfirmationDialog, useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import _ from "lodash";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { Future } from "../../../domain/entities/Future";
import { NamedRef } from "../../../domain/entities/Ref";
import { User } from "../../../domain/entities/User";
import { UpdateStrategy } from "../../../domain/repositories/UserRepository";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";
import { ellipsizedList } from "../../utils/list";

export const MultiSelectorDialog: React.FC<MultiSelectorDialogProps> = ({ type, ids, onClose }) => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const loading = useLoading();

    const [users, setUsers] = useState<User[]>([]);
    const [items, setItems] = useState<NamedRef[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [filtered, setFiltered] = useState<string[]>([]);
    const [filteredValue, setFilteredValue] = useState<string>("");
    const [updateStrategy, setUpdateStrategy] = useState<UpdateStrategy>("merge");
    const title = getTitle(type, users);

    const handleSave = useCallback(() => {
        if (users.length === 0) {
            snackbar.error("Unable to save users");
            return;
        }

        loading.show(true, i18n.t("Saving users"));
        const update = items.filter(({ id }) => selected.includes(id));

        compositionRoot.users.updateProp(type, ids, update, updateStrategy).run(
            () => {
                onClose();
                loading.reset();
            },
            error => {
                snackbar.error(error);
                loading.reset();
            }
        );
    }, [type, ids, onClose, snackbar, updateStrategy, items, users, selected, compositionRoot, loading]);

    useEffect(() => {
        return Future.joinObj({
            items: compositionRoot.metadata.list(type).map(({ objects }) => objects),
            users: compositionRoot.users.get(ids),
        }).run(
            ({ items, users }) => {
                const roleIds = users.map(user => user[type].map(({ id }) => id));
                const commonRoles = _.intersection(...roleIds);

                setItems(items);
                setUsers(users);
                setSelected(commonRoles);
                setUpdateStrategy(users.length > 1 ? "merge" : "replace");
            },
            error => snackbar.error(error)
        );
    }, [type, ids, compositionRoot, snackbar]);

    return (
        <ConfirmationDialog
            isOpen={true}
            title={title}
            onCancel={onClose}
            maxWidth={"lg"}
            fullWidth={true}
            onSave={handleSave}
        >
            <Container>
                <Label>{i18n.t("Update strategy: ", { nsSeparator: false })}</Label>

                <SegmentedControl
                    options={[
                        {
                            label: i18n.t("Merge"),
                            value: "merge",
                            disabled: users.length === 1,
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
                options={buildTransferOptions(items)}
                selected={
                    filtered.length === 0 && filteredValue !== "" ? [] : filtered.length !== 0 ? filtered : selected
                }
                onChange={({ selected: picked }) => {
                    setSelected(filtered.length !== 0 ? _.difference(selected, filtered) : picked);
                    setFiltered([]);
                }}
                onFilterChangePicked={filtered => {
                    setFilteredValue(filtered.value);
                    const filteredItems = items.filter(item =>
                        item.name.toLowerCase().includes(filtered.value.toLowerCase())
                    );
                    const filteredIds = selected.filter(select => {
                        return filteredItems.some(filtered => filtered.id === select);
                    });

                    setFiltered(filteredIds);
                }}
                filterable={true}
                filterablePicked={true}
                filterPlaceholder={i18n.t("Search")}
                filterPlaceholderPicked={i18n.t("Search")}
                selectedWidth="100%"
                optionsWidth="100%"
                height="400px"
            />
        </ConfirmationDialog>
    );
};

const getTitle = (type: "userRoles" | "userGroups", users: User[]): string => {
    const usernames = ellipsizedList(users.map(user => user.username));

    return type === "userRoles"
        ? i18n.t("Assign roles to {{usernames}}", { usernames })
        : i18n.t("Assign groups to {{usernames}}", { usernames });
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
    font-weight: bold;
`;

export interface MultiSelectorDialogProps {
    // TODO: Add organisation units
    type: "userRoles" | "userGroups";
    ids: string[];
    onClose: () => void;
}
