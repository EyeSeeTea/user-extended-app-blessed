import { AppConfig } from "./webapp/pages/app/AppConfig";

export const appConfig: AppConfig = {
    appKey: "user-extended-app",
    appearance: {
        showShareButton: false,
    },
    feedback: {
        repositories: {
            clickUp: {
                listId: "170646832",
                title: "[User feedback] {title}",
                body: "## dhis2\n\nUsername: {username}\n\n{body}",
            },
        },
        layoutOptions: {
            showContact: false,
            descriptionTemplate: "## Summary\n\n## Steps to reproduce\n\n## Actual results\n\n## Expected results\n\n",
        },
    },
};
