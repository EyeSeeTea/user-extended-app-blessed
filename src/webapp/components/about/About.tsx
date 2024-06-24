import React from "react";
import styled from "styled-components";
import { Info as InfoIcon, Settings as SettingsIcon } from "@material-ui/icons";
import { Link } from "react-router-dom";

interface AboutProps {
    icon: "about" | "settings";
    visible: boolean;
}

const IconComponents = {
    about: {
        Component: InfoIcon,
        path: "/about",
    },
    settings: {
        Component: SettingsIcon,
        path: "/settings",
    },
};

export const About: React.FC<AboutProps> = React.memo(({ icon, visible }) => {
    const IconDefinition = IconComponents[icon];
    return (
        <>
            {visible && (
                <AboutButton to={IconDefinition.path}>
                    <IconDefinition.Component fontSize="small" />
                </AboutButton>
            )}
        </>
    );
});

const AboutButton = styled(Link)`
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10002;
    background-color: #ff9800;
    color: white;
    width: 40px;
    height: 40px;
    cursor: pointer;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 2px;
    background-clip: padding-box;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    box-sizing: border-box;

    &:hover {
        border: 2px solid #ff9800;
    }
`;
