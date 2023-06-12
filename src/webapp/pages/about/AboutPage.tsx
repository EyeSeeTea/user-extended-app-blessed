import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { MarkdownViewer } from "../../components/markdown-viewer/MarkdownViewer";
import { PageHeader } from "../../components/page-header/PageHeader";
import i18n from "../../../locales";

export const AboutPage: React.FC = React.memo(() => {
    const navigate = useNavigate();

    const contents = [
        `#### ${i18n.t("Distributed under GNU GLPv3")}`,
        i18n.t(
            "User-Extended App is a DHIS2 Web Application that provides an easy and integrated way to perform common operations to DHIS2 users which would be burdensome to perform using the in-built DHIS2 User management application."
        ),
        i18n.t(
            "This application has been funded by the the Norwegian Refugee Council (NRC), the WHO Global Malaria Programme and Samaritan’s Purse to support countries in strengthening the collection and use of health data by using DHIS2. The application has been developed by [EyeSeeTea SL](http://eyeseetea.com). Source code, documentation and release notes can be found at the [EyeSeetea GitHub Project Page](https://eyeseetea.github.io/user-extended-app-blessed/)",
            { nsSeparator: false }
        ),
        i18n.t(
            "If you wish to contribute to the development of User Extended App with new features, please contact [EyeSeeTea](mailto:hello@eyeseetea.com).",
            { nsSeparator: false }
        ),
    ].join("\n\n");

    const goBack = React.useCallback(() => {
        navigate(-1);
    }, [navigate]);

    return (
        <StyledLanding>
            <PageHeader title={i18n.t("About User Extended App")} onBackClick={goBack} />
            <div className="about-content">
                <MarkdownViewer source={contents} center={true} />
                <LogoWrapper>
                    <div>
                        <Logo alt={i18n.t("Samaritan's Purse")} src="img/logo-samaritans.svg" />
                    </div>
                    <div>
                        <Logo alt={i18n.t("World Health Organization")} src="img/logo-who.svg" />
                    </div>
                    <div>
                        <Logo alt={i18n.t("EyeSeeTea")} src="img/logo-eyeseetea.png" />
                    </div>
                    <div>
                        <Logo alt={i18n.t("Norwegian Refugee Council")} src="img/logo-nrc.svg" />
                    </div>
                </LogoWrapper>
            </div>
        </StyledLanding>
    );
});

const StyledLanding = styled.div`
    & > div.about-content {
        background-color: rgb(39, 102, 150);
        padding: 0px;
        border-radius: 18px;
        margin: 1em 10px 20px 10px;
        box-shadow: rgba(0, 0, 0, 0.14) 0px 8px 10px 1px, rgba(0, 0, 0, 0.12) 0px 3px 14px 2px,
            rgba(0, 0, 0, 0.2) 0px 5px 5px -3px;
    }

    ${MarkdownViewer} {
        padding: 1rem 2.25rem 0 2.25rem;
        text-align-last: unset;
    }
`;

const LogoWrapper = styled.div`
    display: flex;
    flex-wrap: wrap;
    row-gap: 2em;
    margin: 0 1em;
    padding: 3em 0;
    justify-content: center;
    div {
        display: flex;
        align-items: center;
    }
`;

const Logo = styled.img`
    width: 200px;
    margin: 0 50px;
`;
