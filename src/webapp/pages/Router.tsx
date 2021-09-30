import React from "react";
import { HashRouter, Route, Switch } from "react-router-dom";
import { LegacyAppWrapper } from "../../legacy/LegacyApp";
import { ListHybrid } from "../../legacy/List/List.component";

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
            </Switch>
        </HashRouter>
    );
});
