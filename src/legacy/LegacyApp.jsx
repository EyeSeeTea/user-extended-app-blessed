import App from "./App/App.component";

export const LegacyAppWrapper = props => {
    return <App>{props.children}</App>;
};
