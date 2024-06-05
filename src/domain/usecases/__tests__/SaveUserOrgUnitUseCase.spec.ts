import { SaveUserOrgUnitUseCase, SaveUserOrgUnitOptions } from "../SaveUserOrgUnitUseCase";
import { User } from "../../entities/User";
import { OrgUnit } from "../../entities/OrgUnit";
import { Future } from "../../entities/Future";
import { anything, deepEqual, instance, mock, when, verify } from "ts-mockito";
import _ from "lodash";
import { MetadataResponse } from "@eyeseetea/d2-api/api";
import { UserD2ApiRepository } from "../../../data/repositories/UserD2ApiRepository";
import { sourceUser, targetUser } from "./data/user";

const selectedUsers: User[] = [sourceUser, targetUser];
const selectedOrgUnits: OrgUnit[] = [
    {
        name: "Sierra Leone",
        id: "ImspTQPwCqd",
        path: ["ImspTQPwCqd"],
    },
    {
        name: "Other Org Unit",
        id: "Oou",
        path: ["Oou"],
    },
];

let userRepositoryMock: UserD2ApiRepository;
let saveUserOrgUnitUseCase: SaveUserOrgUnitUseCase;

describe("SaveUserOrgUnitUseCase", () => {
    beforeEach(() => {
        userRepositoryMock = mock(UserD2ApiRepository);
        saveUserOrgUnitUseCase = new SaveUserOrgUnitUseCase(instance(userRepositoryMock));
    });

    it("should replace user's organisation units", async () => {
        const options = givenOptionsToReplace();
        const expectedUsers = givenExpectedUsersReplaced();

        await saveUserOrgUnitUseCase.execute(options).toPromise();

        verify(userRepositoryMock.save(deepEqual(expectedUsers))).once();
    });

    it("should merge user's organisation units", async () => {
        const options = givenOptionsToMerge();
        const expectedUsers = givenExpectedUsersMerged();

        await saveUserOrgUnitUseCase.execute(options).runAsync();

        verify(userRepositoryMock.save(deepEqual(expectedUsers))).once();
    });
});

function givenOptionsToReplace(): SaveUserOrgUnitOptions {
    const orgUnitsIds = selectedOrgUnits.map(({ id }) => id);

    when(userRepositoryMock.save(anything())).thenReturn(Future.success({ status: "OK" } as MetadataResponse));

    return {
        orgUnitsIds: orgUnitsIds,
        updateStrategy: "replace",
        users: selectedUsers,
        orgUnitType: "capture",
    };
}

function givenOptionsToMerge(): SaveUserOrgUnitOptions {
    const orgUnitsIds = selectedOrgUnits.map(({ id }) => id);

    when(userRepositoryMock.save(anything())).thenReturn(Future.success({ status: "OK" } as MetadataResponse));

    return {
        orgUnitsIds: orgUnitsIds,
        updateStrategy: "merge",
        users: selectedUsers,
        orgUnitType: "capture",
    };
}

function givenExpectedUsersReplaced(): User[] {
    return selectedUsers.map(user => ({
        ...user,
        organisationUnits: selectedOrgUnits.map(({ id }) => ({ id, name: "", path: [] })),
    }));
}

function givenExpectedUsersMerged(): User[] {
    return selectedUsers.map(user => ({
        ...user,
        organisationUnits: _(selectedOrgUnits)
            .map<OrgUnit>(({ id }) => ({ id, name: "", path: [] }))
            .unionBy(user.organisationUnits, "id")
            .value(),
    }));
}
