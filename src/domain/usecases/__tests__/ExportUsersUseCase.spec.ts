import { instance, mock, when, verify, deepEqual } from "ts-mockito";
import { User } from "../../entities/User";
import { ExportUsersUseCase, ExportUsersUseCaseOptions } from "../ExportUsersUseCase";
import { Future } from "../../entities/Future";
import moment from "moment";
import { UserD2ApiRepository } from "../../../data/repositories/UserD2ApiRepository";
import {
    columnsAvailableToExport,
    emptyCSVBlob,
    userToExport,
    usersExportCSVBlob,
    usersExportJSONBlob,
} from "./data/usersExport";

let userRepositoryMock: UserD2ApiRepository;
let exportUsersUseCase: ExportUsersUseCase;

describe("ExportUsersUseCase", () => {
    beforeEach(() => {
        userRepositoryMock = mock(UserD2ApiRepository);
        exportUsersUseCase = new ExportUsersUseCase(instance(userRepositoryMock));
    });

    it("should return an empty template when isEmptyTemplate is true", async () => {
        const options: ExportUsersUseCaseOptions = {
            name: "empty-template",
            columns: columnsAvailableToExport,
            format: "csv",
            orgUnitsField: "code",
            isEmptyTemplate: true,
        };

        const { blob, filename } = await exportUsersUseCase.execute(options).toPromise();

        const expectedFilename = `empty-template-${moment().format("YYYY-MM-DD_HH-mm-ss")}.csv`;
        expect(filename).toEqual(expectedFilename);
        // Compare Blob content
        expect(await readBlobAsText(blob)).toEqual(await readBlobAsText(emptyCSVBlob));
        verify(userRepositoryMock.listAll({})).never();
    });

    it("should return a blob and filename when exporting users with CSV format", async () => {
        givenUsersToExport();
        const options: ExportUsersUseCaseOptions = {
            name: "users",
            columns: columnsAvailableToExport,
            format: "csv",
            orgUnitsField: "code",
        };

        const { blob, filename } = await exportUsersUseCase.execute(options).toPromise();

        const expectedFilename = `users-${moment().format("YYYY-MM-DD_HH-mm-ss")}.csv`;
        expect(filename).toEqual(expectedFilename);
        // Compare Blob content
        expect(await readBlobAsText(blob)).toEqual(await readBlobAsText(usersExportCSVBlob));
        verify(userRepositoryMock.listAll(deepEqual({}))).once();
    });

    it("should return a blob and filename when exporting users with JSON format", async () => {
        givenUsersToExport();
        const options: ExportUsersUseCaseOptions = {
            name: "users",
            columns: columnsAvailableToExport,
            format: "json",
            orgUnitsField: "code",
        };

        const { blob, filename } = await exportUsersUseCase.execute(options).toPromise();

        const expectedFilename = `users-${moment().format("YYYY-MM-DD_HH-mm-ss")}.json`;
        expect(filename).toEqual(expectedFilename);
        // Compare Blob content
        expect(await readBlobAsText(blob)).toEqual(await readBlobAsText(usersExportJSONBlob));
        verify(userRepositoryMock.listAll(deepEqual({}))).once();
    });
});

function givenUsersToExport(): void {
    const users = [userToExport as User];
    when(userRepositoryMock.listAll(deepEqual({}))).thenReturn(Future.success(users));
}

/**
 * Reads the content of a Blob as a text string.
 */
function readBlobAsText(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(blob);
    });
}
