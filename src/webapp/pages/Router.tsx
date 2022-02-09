import React from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { LegacyAppWrapper } from "../../legacy/LegacyApp";
import { ListHybrid } from "../../legacy/List/List.component";
import { useAppContext } from "../contexts/app-context";
import { UserBulkEditPage } from "./user-bulk-edit/UserBulkEditPage";
import { UserEditPage } from "./user-edit/UserEditPage";

export const Router: React.FC = React.memo(() => {
    const { api } = useAppContext();

    return (
        <HashRouter>
            <Routes>
                <Route path="/bulk-edit" element={<UserBulkEditPage />} />
                <Route path="/edit/:id" element={<UserEditPage />} />
                <Route
                    path="/"
                    element={
                        <LegacyAppWrapper>
                            <ListHybrid api={api} />
                        </LegacyAppWrapper>
                    }
                />
            </Routes>
        </HashRouter>
    );
});
