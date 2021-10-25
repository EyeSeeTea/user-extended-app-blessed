import React from "react";
import { HashRouter, Route, Switch } from "react-router-dom";
import { LegacyAppWrapper } from "../../legacy/LegacyApp";
import { ListHybrid } from "../../legacy/List/List.component";
import { UserBulkEditPage, ActionType } from "./user-bulk-edit/UserBulkEditPage";

export const Router: React.FC = React.memo(() => {
    return (
        <HashRouter>
            <Switch>
                <Route
                    path="/"
                    render={() => (
                        <LegacyAppWrapper>
                            <ListHybrid params={{ groupName: "userSection", modelType: "user" }} />
                        </LegacyAppWrapper>
                    )}
                />
                <Route
                    path="/:type(import|bulk-edit)"
                    render={({ match }) => <UserBulkEditPage type={match.params.type as ActionType} />}
                />
            </Switch>
        </HashRouter>
    );
});
