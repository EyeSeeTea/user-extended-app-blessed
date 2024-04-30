import _ from "lodash";
import { Maybe } from "../../types/utils";
import { OrgUnit } from "./OrgUnit";
import { Id, NamedRef } from "./Ref";

export interface User {
    id: string;
    name: string;
    username: string;
    firstName: string;
    surname: string;
    email: string;
    phoneNumber: string;
    whatsApp: string;
    facebookMessenger: string;
    skype: string;
    telegram: string;
    twitter: string;
    lastUpdated: Date;
    created: Date;
    apiUrl: string;
    userRoles: NamedRef[];
    userGroups: NamedRef[];
    organisationUnits: OrgUnit[];
    dataViewOrganisationUnits: OrgUnit[];
    searchOrganisationsUnits: OrgUnit[];
    lastLogin: Maybe<Date>;
    disabled: boolean;
    access: AccessPermissions;
    openId: Maybe<string>;
    ldapId: Maybe<string>;
    externalAuth: boolean;
    password: string;
    accountExpiry: Maybe<string>;
    authorities: string[];
    createdBy: Maybe<UserAudit>;
    lastModifiedBy: Maybe<UserAudit>;
    uiLocale: LocaleCode;
    dbLocale: LocaleCode;
}

export interface UserAudit {
    id: Id;
    username: string;
}

const emptyOrgUnit: OrgUnit = { id: "", name: "", path: [] };

export const defaultUser: User = {
    id: "",
    name: "",
    username: "",
    firstName: "",
    surname: "",
    email: "",
    phoneNumber: "",
    whatsApp: "",
    facebookMessenger: "",
    skype: "",
    telegram: "",
    twitter: "",
    lastUpdated: new Date(),
    created: new Date(),
    apiUrl: "",
    userRoles: [{ id: "", name: "" }],
    userGroups: [{ id: "", name: "" }],
    organisationUnits: [emptyOrgUnit],
    dataViewOrganisationUnits: [emptyOrgUnit],
    searchOrganisationsUnits: [emptyOrgUnit],
    lastLogin: new Date(),
    disabled: false,
    access: { read: true, update: true, externalize: true, delete: true, write: true, manage: true },
    openId: "",
    ldapId: "",
    externalAuth: false,
    password: "",
    authorities: [""],
    createdBy: { id: "", username: "" },
    lastModifiedBy: { id: "", username: "" },
    accountExpiry: undefined,
    uiLocale: "",
    dbLocale: "",
};
export interface AccessPermissions {
    read: boolean;
    update: boolean;
    externalize: boolean;
    delete: boolean;
    write: boolean;
    manage: boolean;
}

export const isSuperAdmin = (user: User): boolean => {
    return _.some(user.authorities, authorities => authorities.includes("ALL"));
};

export const hasReplicateAuthority = (user: User): boolean => {
    return _.some(user.authorities, authorities => authorities.includes("F_REPLICATE_USER"));
};

export type LocaleCode = string;
