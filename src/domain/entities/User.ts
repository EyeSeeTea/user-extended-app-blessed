import _ from "lodash";
import { NamedRef } from "./Ref";

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
    organisationUnits: NamedRef[];
    dataViewOrganisationUnits: NamedRef[];
    lastLogin?: Date;
    disabled: boolean;
    access: AccessPermissions;
    openId?: string;
    ldapId?: string;
    externalAuth: boolean;
    password: string;
    // accountExpiry: string;
    authorities: string[];
}

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
    organisationUnits: [{ id: "", name: "" }],
    dataViewOrganisationUnits: [{ id: "", name: "" }],
    lastLogin: new Date(),
    disabled: false,
    access: { read: true, update: true, externalize: true, delete: true, write: true, manage: true },
    openId: "",
    ldapId: "",
    externalAuth: false,
    password: "",
    // accountExpiry: "",
    authorities: [""],
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
