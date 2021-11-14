import { User, UserRole, AccessPermissions } from "../../domain/entities/User";
import { Codec, Schema } from "../../utils/codec";
import { NamedRefModel } from "./DHIS2Model";

/*
export interface User {
    id: string;
    name: string;
    username: string;
    firstName: string;
    surname: string;
    email: string;
    lastUpdated: Date;
    created: Date;
    userRoles: UserRole[];
    userGroups: NamedRef[];
    organisationUnits: NamedRef[];
    dataViewOrganisationUnits: NamedRef[];
    lastLogin: Date;
    disabled: boolean;
    access: AccessPermissions;
}

export interface AccessPermissions {
    read?: boolean;
    update?: boolean;
    externalize?: boolean;
    delete?: boolean;
    write?: boolean;
    manage?: boolean;
}
*/
export const AccessPermissionsModel: Codec<AccessPermissions> = Schema.object({
    read: Schema.optional(Schema.boolean),
    update: Schema.optional(Schema.boolean),
    externalize: Schema.optional(Schema.boolean),
    delete: Schema.optional(Schema.boolean),
    write: Schema.optional(Schema.boolean),
    manage: Schema.optional(Schema.boolean),
});

export const UserRolesModel: Codec<UserRole> = Schema.object({
    id: Schema.nonEmptyString,
    name: Schema.nonEmptyString,
    authorities: Schema.array(Schema.string),
});

/*
export interface User {
    id: string;
    name: string;
    username: string;
    firstName: string;
    surname: string;
    email: string;
    lastUpdated: Date;
    created: Date;
    userRoles: UserRole[];
    userGroups: NamedRef[];
    organisationUnits: NamedRef[];
    dataViewOrganisationUnits: NamedRef[];
    lastLogin: Date;
    disabled: boolean;
    access: AccessPermissions;
}
*/

export const UserModel: Codec<User> = Schema.object({
    id: Schema.nonEmptyString,
    name: Schema.nonEmptyString,
    username: Schema.nonEmptyString,
    firstName: Schema.nonEmptyString,
    surname: Schema.nonEmptyString,
    email: Schema.nonEmptyString,
    lastUpdated: Schema.date,
    created: Schema.date,
    userRoles: UserRolesModel,
    userGroups: Schema.array(NamedRefModel),
    organisationUnits: Schema.array(NamedRefModel),
    dataViewOrganisationUnits: Schema.array(NamedRefModel),
    lastLogin: Schema.date,
    disabled: Schema.boolean,
    access: AccessPermissionsModel
});
