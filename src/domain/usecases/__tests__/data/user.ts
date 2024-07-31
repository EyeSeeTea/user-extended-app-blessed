import { User, defaultUser } from "../../../entities/User";

export const sourceUser: User = {
    ...defaultUser,
    id: "oXD88WWSQpR",
    name: "Alain Traore",
    username: "traore",
    userGroups: [
        {
            name: "Partner for Health International",
            id: "GZSvMCVowAx",
        },
        {
            name: "_DATASET_Superuser",
            id: "B6JNeAQ6akX",
        },
        {
            name: "World Health Program",
            id: "Iqfwd3j2qe5",
        },
        {
            name: "_PROGRAM_Superuser",
            id: "gXpmQO6eEOo",
        },
    ],
    userRoles: [
        {
            id: "Ufph3mGRmMo",
            name: "Superuser",
        },
    ],
    organisationUnits: [
        {
            code: "OU_525",
            name: "Sierra Leone",
            id: "ImspTQPwCqd",
            path: ["ImspTQPwCqd"],
        },
    ],
    dataViewOrganisationUnits: [
        {
            code: "OU_525",
            name: "Sierra Leone",
            id: "ImspTQPwCqd",
            path: ["ImspTQPwCqd"],
        },
    ],
};

export const targetUser: User = {
    ...defaultUser,
    id: "DXyJmlo9rge",
    name: "Android Barnes",
    username: "android",
    userGroups: [
        {
            name: "Partner for Health International",
            id: "GZSvMCVowAx",
        },
        {
            name: "_DATASET_Data entry clerk",
            id: "tH0GcNZZ1vW",
        },
    ],
    userRoles: [
        {
            id: "Euq3XfEIEbx",
            name: "Data entry clerk",
        },
        {
            id: "DRdaVRtwmG5",
            name: "Inpatient program",
        },
        {
            id: "cUlTcejWree",
            name: "TB program",
        },
    ],
    organisationUnits: [
        {
            code: "OU_666",
            name: "Ngelehun CHC",
            id: "DiszpKrYNg8",
            path: ["ImspTQPwCqd", "O6uvpzGd5pu", "YuQRtpLP10I", "DiszpKrYNg8"],
        },
    ],
    dataViewOrganisationUnits: [
        {
            code: "OU_333",
            name: "Badjia",
            id: "YuQRtpLP10I",
            path: ["ImspTQPwCqd", "O6uvpzGd5pu", "YuQRtpLP10I"],
        },
    ],
};
