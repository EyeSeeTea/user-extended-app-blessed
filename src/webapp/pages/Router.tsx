import React from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { LegacyAppWrapper } from "../../legacy/LegacyApp";
import { ListHybrid } from "../../legacy/List/List.component";
import { useAppContext } from "../contexts/app-context";
import { UserBulkEditPage } from "./user-bulk-edit/UserBulkEditPage";
import { UserEditPage } from "./user-edit/UserEditPage";
import { About } from "../components/about/About";
import { AboutPage } from "./about/AboutPage";

export const Router: React.FC = React.memo(() => {
    const { api } = useAppContext();

    return (
        <HashRouter>
            <Routes>
                <Route path="/bulk-edit" element={<UserBulkEditPage isEdit={true} />} />
                <Route path="/edit/:id" element={<UserEditPage type="edit" />} />
                <Route path="/new" element={<UserEditPage type="new" />} />
                <Route path="/about" element={<AboutPage />} />

                <Route
                    path="/"
                    element={
                        <LegacyAppWrapper>
                            <ListHybrid api={api} />
                        </LegacyAppWrapper>
                    }
                />
            </Routes>
            <About visible={true} />
        </HashRouter>
    );
});
