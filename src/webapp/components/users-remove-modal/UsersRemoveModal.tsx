import React from "react";
import { ConfirmationDialog, useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";

import { useAppContext } from "../../contexts/app-context";
import { Id } from "../../../domain/entities/Ref";
import { User } from "../../../domain/entities/User";
import i18n from "../../../locales";

type UsersRemoveModalProps = {
    isOpen: boolean;
    ids: Id[];
    onSuccess: () => void;
    onCancel: () => void;
};

export const UsersRemoveModal: React.FC<UsersRemoveModalProps> = ({ ids, isOpen, onCancel, onSuccess }) => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const loading = useLoading();
    const [usersToRemove, setUsersToRemove] = React.useState<User[]>([]);

    React.useEffect(() => {
        compositionRoot.users.get(ids).run(usersInfo => {
            setUsersToRemove(usersInfo);
        }, console.error);
    }, [compositionRoot.users, ids]);

    const onSave = () => {
        loading.show(true, i18n.t("Removing Users..."));
        compositionRoot.users.remove(usersToRemove).run(
            () => {
                const usernames = usersToRemove.map(user => user.username).join(", ");
                snackbar.success(i18n.t("Users removed successfully: {{users}}", { users: usernames }));
                setUsersToRemove([]);
                onSuccess();
                loading.hide();
            },
            err => {
                loading.hide();
                snackbar.error(err);
            }
        );
    };

    return (
        <ConfirmationDialog
            isOpen={isOpen}
            onSave={onSave}
            onCancel={onCancel}
            title={i18n.t("Remove users")}
            description={i18n.t("Are you sure you want to remove the selected users? {{users}}", {
                users: usersToRemove.map(user => user.username).join(", "),
            })}
            saveText={i18n.t("Confirm")}
        />
    );
};
