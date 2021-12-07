import { getApiUrl } from "./commands";

const users = {
    admin: { username: "cypress-admin", password: "Testing123$" },
    basic: { username: "cypress-basic", password: "Testing123$" },
};

export class App {
    /* Constructors */

    static get(options: { user: UserKey }): App {
        const app = new App();
        app.load(users[options.user]);
        return app;
    }

    /* Generic Helpers */

    load(auth: { username: string; password: string }) {
        cy.request({ method: "GET", url: getApiUrl("/api/me"), auth, log: true }).then(res => {
            expect(res.status).to.equal(200);
        });

        cy.visit("/");
    }

    shouldContainText(text: string, options?: { clickable: boolean }) {
        if (options?.clickable) {
            cy.contains(text).should("have.css", "cursor", "pointer");
        } else {
            cy.contains(text);
        }
    }

    shouldNotContainText(text: string) {
        cy.findByText(text).should("not.exist");
    }

    shouldNotShowText(text: string) {
        cy.findByText(text).should("not.be.visible");
    }

    clickOnText(text: string) {
        cy.contains(text).click();
    }

    /* MUI helpers */

    selectOptionSelector(options: { label: string; select: string }) {
        const { label, select } = options;
        this.shouldContainText(label);
        this.clickOnText(label);
        cy.findByRole("presentation").findByText(select).click();
    }
}

type UserKey = keyof typeof users;
