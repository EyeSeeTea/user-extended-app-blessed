import { App } from "../support/App";

describe("Landing page", () => {
    let app: App;

    beforeEach(() => {
        app = App.get({ user: "basic" });
    });

    it("should have a John section", () => {
        app.clickOnText("John");
        app.shouldContainText("Hello John");
    });

    it("should have a Mary section", () => {
        app.clickOnText("Mary");
        app.shouldContainText("Mary");
    });
});
