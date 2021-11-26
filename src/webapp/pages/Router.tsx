import React from "react";
import { HashRouter, Route, Switch } from "react-router-dom";
import { LegacyAppWrapper } from "../../legacy/LegacyApp";
import { ListHybrid } from "../../legacy/List/List.component";
import { useAppContext } from "../contexts/app-context";

export const Router: React.FC = React.memo(() => {
    const { api } = useAppContext();

    return (
        <HashRouter>
            <Switch>
                <Route
                    path="/"
                    render={() => (
                        <LegacyAppWrapper>
                            <ListHybrid params={{ groupName: "userSection", modelType: "user" }} api={api} />
                        </LegacyAppWrapper>
                    )}
                />
            </Switch>
        </HashRouter>
    );
});
