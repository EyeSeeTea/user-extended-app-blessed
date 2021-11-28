import React from "react";
import { HashRouter, Route, Switch, Redirect } from "react-router-dom";
import { LegacyAppWrapper } from "../../legacy/LegacyApp";
import { ListHybrid } from "../../legacy/List/List.component";
import { UserBulkEditPage, ActionType } from "./user-bulk-edit/UserBulkEditPage";
import { useAppContext } from "../contexts/app-context";

export const Router: React.FC = React.memo(() => {
    const { api } = useAppContext();
    return (
        <HashRouter>
            <Switch>
                <Route path="/bulk-edit" render={() => <UserBulkEditPage />} />
                <Route
                    path="/"
                    render={() => (
                        <LegacyAppWrapper>
                            <ListHybrid params={{ groupName: "userSection", modelType: "user" }} />
                        </LegacyAppWrapper>
                    )}
                />
            </Switch>
        </HashRouter>
    );
});
