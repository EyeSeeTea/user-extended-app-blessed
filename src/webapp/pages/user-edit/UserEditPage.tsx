import { useConfig } from "@dhis2/app-runtime";
import { Button } from "@dhis2/ui";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { OpenInNew } from "@material-ui/icons";
import _ from "lodash";
import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import styled from "styled-components";
import { defaultUser, User } from "../../../domain/entities/User";
import i18n from "../../../locales";
import { generateUid } from "../../../utils/uid";
import { PageHeader } from "../../components/page-header/PageHeader";
import { UserEditWizard } from "../../components/user-edit-wizard/UserEditWizard";
import { useAppContext } from "../../contexts/app-context";
import { useGoBack } from "../../hooks/useGoBack";

export interface UserEditPageParams {
    type: "new" | "edit";
    id?: string;
}

export const UserEditPage: React.FC = () => {
    const { baseUrl } = useConfig();
    const { compositionRoot } = useAppContext();
    const { type = "edit", id } = useParams();
    // Check type User
    const location = useLocation() as any;

    const snackbar = useSnackbar();
    const goBack = useGoBack();

    const [user, setUser] = useState<User>(location.state?.user);

    const isValidEdit = id !== undefined || location.state?.user !== undefined;
    const title = type === "edit" && isValidEdit ? i18n.t("Edit user") : i18n.t("New user");

    const saveUser = useCallback(
        async (user: User) => {
            const { data = [], error } = await compositionRoot.users.save([user]).runAsync();
            if (error || _.some(data, ({ status }) => status === "ERROR")) {
                return error ?? i18n.t("Network error");
            } else {
                goBack(true);
            }
        },
        [compositionRoot, goBack]
    );

    const openUserManagement = useCallback(() => {
        window
            ?.open(`${baseUrl}/dhis-web-user/index.html#/users/edit/${id}`, "_blank")
            ?.focus();
    }, [baseUrl, id]);

    useEffect(() => {
        if (user !== undefined) return;
        else if (id === undefined) {
            setUser({ ...defaultUser, id: generateUid() });
            return;
        }

        compositionRoot.users
            .get(id)
            .toPromise()
            .then((user) => {
                if (!user) snackbar.error(i18n.t("Unable to load user {{id}}", { id }));
                else setUser(user);
            });
    }, [compositionRoot, id, user, setUser, snackbar]);

    return (
        <Wrapper>
            <PageHeader onBackClick={goBack} title={title}>
                {isValidEdit && (
                    <MaintenanceButton icon={<OpenInNew />} onClick={openUserManagement}>
                        {i18n.t("Open in user management")}
                    </MaintenanceButton>
                )}
            </PageHeader>

            {user !== undefined ? (
                <UserEditWizard user={user} onCancel={goBack} onSave={saveUser} />
            ) : null}
        </Wrapper>
    );
};

const Wrapper = styled.div`
    margin: 20px 30px;
`;

const MaintenanceButton = styled(Button)`
    float: right;
    margin-top: 2px;

    :focus::after {
        border-color: transparent !important;
    }
`;
