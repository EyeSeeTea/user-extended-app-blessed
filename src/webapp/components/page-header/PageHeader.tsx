import { ButtonProps, Icon, IconButton as MUIIConButton, Tooltip } from "@material-ui/core";
import { Variant } from "@material-ui/core/styles/createTypography";
import Typography from "@material-ui/core/Typography";
import { DialogButton } from "@eyeseetea/d2-ui-components";
import React from "react";
import i18n from "../../../locales";
import styled from "styled-components";

export const PageHeader: React.FC<PageHeaderProps> = React.memo(props => {
    const { variant = "h5", title, onBackClick, helpText, children } = props;
    return (
        <div>
            {!!onBackClick && (
                <BackButton
                    onClick={onBackClick}
                    color="secondary"
                    aria-label={i18n.t("Back")}
                    data-test={"page-header-back"}
                >
                    <Icon color="primary">arrow_back</Icon>
                </BackButton>
            )}

            <Title variant={variant} gutterBottom data-test={"page-header-title"}>
                {title}
            </Title>

            {helpText && <HelpButton text={helpText} />}

            {children}
        </div>
    );
});

export interface PageHeaderProps {
    variant?: Variant;
    title: string;
    onBackClick?: () => void;
    helpText?: string;
}

const Title = styled(Typography)`
    display: inline-block;
    font-weight: 300;
`;

const Button: React.FC<ButtonProps> = ({ onClick }) => (
    <Tooltip title={i18n.t("Help")}>
        <IconButton onClick={onClick}>
            <Icon color="primary">help</Icon>
        </IconButton>
    </Tooltip>
);

const HelpButton: React.FC<{ text: string }> = ({ text }) => (
    <DialogButton buttonComponent={Button} title={i18n.t("Help")} maxWidth={"sm"} fullWidth={true} contents={text} />
);

const IconButton = styled(MUIIConButton)`
    margin-bottom: 8px;
`;

const BackButton = styled(IconButton)`
    padding-top: 10px;
    margin-bottom: 5px;
`;
