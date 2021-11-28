import _ from "lodash";
import { NamedRef } from "./Ref";

export interface User {
    id: string;
    name: string;
    username: string;
    firstName: string;
    surname: string;
    email: string;
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
    authorities: string[];
}

export interface AccessPermissions {
    read?: boolean;
    update?: boolean;
    externalize?: boolean;
    delete?: boolean;
    write?: boolean;
    manage?: boolean;
}

export const isSuperAdmin = (user: User): boolean => {
    return _.some(user.authorities, (authorities) => authorities.includes("ALL"));
};

export const hasReplicateAuthority = (user: User): boolean => {
    return _.some(user.authorities, (authorities) => authorities.includes("F_REPLICATE_USER"));
};
