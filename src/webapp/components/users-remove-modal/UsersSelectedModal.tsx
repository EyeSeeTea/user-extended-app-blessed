import React from "react";
import _ from "lodash";
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
    actionType: ActionType;
};

export type ActionType = "remove" | "enable" | "disable";

function getMessagesByActionType(actionType: ActionType): { title: string } {
    if (actionType === "remove") {
        return { title: "Remove" };
    } else if (actionType === "disable") {
        return { title: "Disable" };
    } else if (actionType === "enable") {
        return { title: "Enable" };
    }
    return { title: "" };
}

function generateMessage(users: User[]) {
    const firstThreeUsers = _(users).take(3).value();
    const remainingUsersCount = users.length - firstThreeUsers.length;
    return remainingUsersCount > 0 ? `and ${remainingUsersCount} more` : "";
}

export const UsersSelectedModal: React.FC<UsersRemoveModalProps> = ({
    actionType,
    ids,
    isOpen,
    onCancel,
    onSuccess,
}) => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const loading = useLoading();
    const [users, setUsers] = React.useState<User[]>([]);

    React.useEffect(() => {
        compositionRoot.users.get(ids).run(usersInfo => {
            setUsers(usersInfo);
        }, snackbar.error);
    }, [compositionRoot.users, ids, snackbar]);

    const messages = getMessagesByActionType(actionType);

    const firstThreeUsers = _(users)
        .take(3)
        .map(user => user.username)
        .value();

    const onSuccessAction = () => {
        snackbar.success(
            i18n.t("Users {{action}}. {{users}} {{remainingCount}}", {
                action: `${actionType}d`,
                users: firstThreeUsers.join(", "),
                remainingCount: generateMessage(users),
            })
        );
        setUsers([]);
        onSuccess();
        loading.hide();
    };

    const onErrorAction = (err: string) => {
        loading.hide();
        snackbar.error(err);
    };

    const onSave = () => {
        loading.show();
        if (actionType === "remove") {
            compositionRoot.users.remove(users).run(() => {
                onSuccessAction();
            }, onErrorAction);
        } else if (actionType === "disable" || actionType === "enable") {
            compositionRoot.users.saveStatus(users, actionType === "disable").run(() => {
                onSuccessAction();
            }, onErrorAction);
        }
    };

    return (
        <ConfirmationDialog
            isOpen={isOpen}
            onSave={onSave}
            onCancel={onCancel}
            title={i18n.t("{{action}} users", { action: messages.title })}
            description={i18n.t(
                "Are you sure you want to {{action}} the selected users? {{users}} {{remainingCount}}",
                { action: actionType, users: firstThreeUsers.join(", "), remainingCount: generateMessage(users) }
            )}
            saveText={i18n.t("Confirm")}
        />
    );
};
