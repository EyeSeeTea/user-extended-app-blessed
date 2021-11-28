import _ from "lodash";
import { NamedRef } from "./Ref";

export interface User {
    id: string;
    name: string;
    username: string;
    firstName: string;
    surname: string;
    email: string;
    lastUpdated: string;
    created: string;
    apiUrl: string;
    userRoles: NamedRef[];
    userGroups: NamedRef[];
    organisationUnits: NamedRef[];
    dataViewOrganisationUnits: NamedRef[];
    lastLogin?: string;
    disabled: boolean;
    access: AccessPermissions;
    openId?: string;
    authorities: string[];
}
export const defaultUser: User = {
    id: "",
    name: "",
    username: "",
    firstName: "",
    surname: "",
    email: "",
    lastUpdated: "",
    created: "",
    apiUrl: "",
    userRoles: [{ id: "", name: "" }],
    userGroups: [{ id: "", name: "" }],
    organisationUnits: [{ id: "", name: "" }],
    dataViewOrganisationUnits: [{ id: "", name: "" }],
    lastLogin: "",
    disabled: false,
    access: { read: true, update: true, externalize: true, delete: true, write: true, manage: true },
    openId: "",
    authorities: [""],
};
export interface AccessPermissions {
    read?: boolean;
    update?: boolean;
    externalize?: boolean;
    delete?: boolean;
    write?: boolean;
    manage?: boolean;
}

export const isSuperAdmin = (user: User): boolean => {
    return _.some(user.authorities, authorities => authorities.includes("ALL"));
};

export const hasReplicateAuthority = (user: User): boolean => {
    return _.some(user.authorities, authorities => authorities.includes("F_REPLICATE_USER"));
};
