export const appConfig: AppConfig = {
    appKey: "user-extended-app",
    appearance: {
        showShareButton: false,
    },
    feedback: {
        token: ["03242fc6b0c5a48582", "2e6b8d3e8337b5a0b95fe2"],
        createIssue: true,
        sendToDhis2UserGroups: [],
        issues: {
            repository: "EyeSeeTea/user-extended-app-blessed",
            title: "[User feedback] {title}",
            body: "## dhis2\n\nUsername: {username}\n\n{body}",
        },
        snapshots: {
            repository: "EyeSeeTeaBotTest/snapshots",
            branch: "master",
        },
        feedbackOptions: {},
    },
};

export interface AppConfig {
    appKey: string;
    appearance: {
        showShareButton: boolean;
    };
    feedback?: {
        token: string[];
        createIssue: boolean;
        sendToDhis2UserGroups: string[];
        issues: {
            repository: string;
            title: string;
            body: string;
        };
        snapshots: {
            repository: string;
            branch: string;
        };
        feedbackOptions: object;
    };
}
