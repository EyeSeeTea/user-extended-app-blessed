import { Transfer, TransferOption } from "@dhis2/ui";
import { ConfirmationDialog, useSnackbar } from "@eyeseetea/d2-ui-components";
import _, { intersection } from "lodash";
import { useState, useEffect } from "react";
import { NamedRef } from "../../../domain/entities/Ref";
import { User } from "../../../domain/entities/User";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";
import { ellipsizedList } from "../../utils/list";

export interface UserRolesSelectorProps {
    ids: string[];
    onCancel: () => void;
}

export const UserRolesSelector: React.FC<UserRolesSelectorProps> = props => {
    const snackbar = useSnackbar();
    const { compositionRoot } = useAppContext();
    const [users, setUsers] = useState([] as User[]);
    const [userRoles, setUserRoles] = useState([] as TransferOption[]);
    const [selectedRoles, setSelectedRoles] = useState([""]);
    const { ids } = props;
    useEffect(() => {
        compositionRoot.metadata
            .list("userRoles")
            .map(({ objects }) => buildTransferOptions(objects))
            .run(
                roles => setUserRoles(roles),
                error => snackbar.error(error)
            );
        compositionRoot.users.getMany(ids).run(
            users => {
                setUsers(users);
                setSelectedRoles(_.intersection(...users.map(user => user.userRoles.map(({ id }) => id))));
            },
            error => snackbar.error(error)
        );
    }, [ids]);

    const onChange = (payload: { selected: string[] }) => setSelectedRoles(payload.selected);

    return (
        <ConfirmationDialog
            isOpen={true}
            title={getTitle(users)}
            onCancel={props.onCancel}
            maxWidth={"lg"}
            fullWidth={true}
            onSave={() => {
                //todo
            }}
        >
            <Transfer
                options={userRoles}
                selected={selectedRoles}
                onChange={onChange}
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
