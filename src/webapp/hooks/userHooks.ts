import { useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import React from "react";
import { Id } from "../../domain/entities/Ref";
import { User } from "../../domain/entities/User";
import { UpdateStrategy, AccessElements, ListOptions } from "../../domain/repositories/UserRepository";
import { SaveUserOrgUnitOptions } from "../../domain/usecases/SaveUserOrgUnitUseCase";
import { useAppContext } from "../contexts/app-context";
import i18n from "../../locales";
import { AllowedExportFormat, ColumnMappingKeys } from "../../domain/usecases/ExportUsersUseCase";
import FileSaver from "file-saver";
import { OrgUnitKey } from "../../domain/entities/OrgUnit";

type UseSaveUsersOrgUnitsProps = { onSuccess: () => void };
type UseExportUsersProps = {
    onSuccess: () => void;
    columns: ColumnMappingKeys[];
    filterOptions: ListOptions;
    orgUnitsField: OrgUnitKey;
};

type UseCopyInUserProps = { onSuccess: () => void };

export function useGetUsersByIds(ids: Id[]) {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const loading = useLoading();
    const [users, setUsers] = React.useState<User[]>();

    React.useEffect(() => {
        if (ids.length === 0) return;
        loading.show(true);
        return compositionRoot.users.get(ids).run(
            users => {
                setUsers(users);
                loading.hide();
            },
            error => {
                snackbar.error(error);
            }
        );
    }, [compositionRoot.users, ids, loading, snackbar]);

    return { setUsers, users };
}

export function useSaveUsersOrgUnits(props: UseSaveUsersOrgUnitsProps) {
    const { onSuccess } = props;
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const loading = useLoading();

    const saveUsersOrgUnits = React.useCallback(
        (
            orgUnitIds: Id[],
            updateStrategy: UpdateStrategy,
            users: User[],
            orgUnitType: SaveUserOrgUnitOptions["orgUnitType"]
        ) => {
            loading.show(true, i18n.t("Saving..."));
            return compositionRoot.users
                .saveOrgUnits({
                    orgUnitsIds: orgUnitIds,
                    updateStrategy: updateStrategy,
                    users: users,
                    orgUnitType,
                })
                .run(
                    () => {
                        onSuccess();
                        loading.hide();
                    },
                    error => {
                        snackbar.error(error);
                        loading.hide();
                    }
                );
        },
        [compositionRoot.users, onSuccess, snackbar, loading]
    );

    return { saveUsersOrgUnits };
}

export function useGetAllUsers() {
    const { compositionRoot } = useAppContext();
    const [users, setUsers] = React.useState<User[]>();
    const snackbar = useSnackbar();

    React.useMemo(() => {
        compositionRoot.users.listAll({}).run(
            allUsers => {
                setUsers(allUsers);
            },
            error => {
                snackbar.error(error);
            }
        );
    }, [compositionRoot, snackbar]);

    return { users };
}

export function useCopyInUser(props: UseCopyInUserProps) {
    const { onSuccess } = props;
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const loading = useLoading();

    const copyInUser = React.useCallback(
        (user: User, selectedUsersIds: Id[], updateStrategy: UpdateStrategy, accessElements: AccessElements) => {
            loading.show(true, i18n.t("Saving..."));
            return compositionRoot.users
                .copyInUser({
                    user,
                    selectedUsersIds,
                    updateStrategy,
                    accessElements,
                })
                .run(
                    () => {
                        onSuccess();
                        loading.hide();
                    },
                    error => {
                        snackbar.error(error);
                        loading.hide();
                    }
                );
        },
        [compositionRoot.users, onSuccess, snackbar, loading]
    );

    return { copyInUser };
}

export const useExportUsers = (props: UseExportUsersProps) => {
    const { onSuccess, columns, filterOptions, orgUnitsField } = props;

    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const loading = useLoading();

    const exportUsers = React.useCallback(
        (name: string, format: AllowedExportFormat, isEmptyTemplate = false) => {
            loading.show();

            const exportOptions = { name, columns, filterOptions, format, orgUnitsField, isEmptyTemplate };
            return compositionRoot.users.export(exportOptions).run(
                ({ blob, filename }) => {
                    FileSaver.saveAs(blob, filename);
                    onSuccess();
                    snackbar.success(i18n.t("Table exported: {{filename}}", { filename, nsSeparator: false }));
                    loading.hide();
                },
                error => {
                    snackbar.error(error);
                    loading.hide();
                }
            );
        },
        [columns, compositionRoot.users, filterOptions, onSuccess, snackbar, loading, orgUnitsField]
    );

    return {
        exportUsersToCSV: React.useCallback(() => exportUsers("users", "csv"), [exportUsers]),
        exportUsersToJSON: React.useCallback(() => exportUsers("users", "json"), [exportUsers]),
        exportEmptyTemplate: React.useCallback(() => exportUsers("empty-user-template", "csv", true), [exportUsers]),
    };
};
