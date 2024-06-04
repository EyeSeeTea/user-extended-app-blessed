import { User } from "../../../entities/User";
import { ColumnMappingKeys } from "../../ExportUsersUseCase";

export const userToExport: Partial<User> = {
    id: "oXD88WWSQpR",
    username: "traore",
    firstName: "Alain",
    surname: "Traore",
    userRoles: [
        {
            id: "Ufph3mGRmMo",
            name: "Superuser",
        },
    ],
    userGroups: [
        {
            name: "_DATASET_Superuser",
            id: "B6JNeAQ6akX",
        },
        {
            name: "Administrators",
            id: "wl5cDMuUhmF",
        },
        {
            name: "_PROGRAM_Superuser",
            id: "gXpmQO6eEOo",
        },
    ],
    organisationUnits: [
        {
            name: "Sierra Leone",
            id: "ImspTQPwCqd",
            path: ["ImspTQPwCqd"],
        },
    ],
    dataViewOrganisationUnits: [
        {
            name: "Sierra Leone",
            id: "ImspTQPwCqd",
            path: ["ImspTQPwCqd"],
        },
    ],
    created: new Date("2013-03-11T09:51:41.232Z"),
    lastUpdated: new Date("2024-06-04T06:25:46.788Z"),
    apiUrl: "/dhis2/api/users/oXD88WWSQpR.json",
    searchOrganisationsUnits: [
        {
            name: "Approved School CHP",
            id: "eoYV2p74eVz",
            path: ["eoYV2p74eVz"],
        },
    ],
    lastLogin: new Date("2013-12-30T09:16:43.235Z"),
    status: "Active",
    disabled: false,
    lastModifiedBy: {
        id: "xE7jOejl9FI",
        username: "John Traore",
    },
};

export const columnsAvailableToExport: ColumnMappingKeys[] = [
    "id",
    "username",
    "firstName",
    "surname",
    "userRoles",
    "userGroups",
    "organisationUnits",
    "dataViewOrganisationUnits",
    "email",
    "phoneNumber",
    "openId",
    "created",
    "lastUpdated",
    "apiUrl",
    "searchOrganisationsUnits",
    "lastLogin",
    "status",
    "disabled",
    "createdBy",
    "lastModifiedBy",
];

export const emptyCSVBlob = buildBlob(
    "ID,Username,First name,Surname,Roles,Groups,OUCapture,OUOutput,Email,Phone number,Open ID,Created,Updated,API URL,OUSearch,Last login,Status,Disabled,Created by,Last modified by"
);
export const usersExportCSVBlob = buildBlob(
    "ID,Username,First name,Surname,Roles,Groups,OUCapture,OUOutput,Email,Phone number,Open ID,Created,Updated,API URL,OUSearch,Last login,Status,Disabled,Created by,Last modified by\r\noXD88WWSQpR,traore,Alain,Traore,Superuser,_DATASET_Superuser||Administrators||_PROGRAM_Superuser,Sierra Leone,Sierra Leone,,,,2013-03-11 10:51:41,2024-06-04 08:25:46,/dhis2/api/users/oXD88WWSQpR.json,Approved School CHP,2013-12-30 10:16:43,Active,false,,John Traore"
);
export const usersExportJSONBlob = buildBlob(
    '[\n    {\n        "id": "oXD88WWSQpR",\n        "username": "traore",\n        "firstName": "Alain",\n        "surname": "Traore",\n        "userRoles": [\n            "Superuser"\n        ],\n        "userGroups": [\n            "_DATASET_Superuser",\n            "Administrators",\n            "_PROGRAM_Superuser"\n        ],\n        "organisationUnits": [\n            "Sierra Leone"\n        ],\n        "dataViewOrganisationUnits": [\n            "Sierra Leone"\n        ],\n        "created": "2013-03-11 10:51:41",\n        "lastUpdated": "2024-06-04 08:25:46",\n        "apiUrl": "/dhis2/api/users/oXD88WWSQpR.json",\n        "searchOrganisationsUnits": [\n            "Approved School CHP"\n        ],\n        "lastLogin": "2013-12-30 10:16:43",\n        "status": "Active",\n        "disabled": false,\n        "lastModifiedBy": "John Traore"\n    }\n]'
);

function buildBlob(dataString: string) {
    return new Blob([dataString], { type: "text/plain;charset=utf-8" });
}
