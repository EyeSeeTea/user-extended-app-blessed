import { User, UserRole, AccessPermissions } from "../../domain/entities/User";
import { Codec, Schema } from "../../utils/codec";
import { NamedRefModel } from "./DHIS2Model";

export const AccessPermissionsModel: Codec<AccessPermissions> = Schema.object({
    read: Schema.optional(Schema.boolean),
    update: Schema.optional(Schema.boolean),
    externalize: Schema.optional(Schema.boolean),
    delete: Schema.optional(Schema.boolean),
    write: Schema.optional(Schema.boolean),
    manage: Schema.optional(Schema.boolean),
});

export const UserRolesModel: Codec<UserRole> = Schema.extend(
    NamedRefModel,
    Schema.object({
        authorities: Schema.array(Schema.string),
    })
);

export const UserModel: Codec<User> = Schema.object({
    id: Schema.nonEmptyString,
    name: Schema.nonEmptyString,
    username: Schema.nonEmptyString,
    firstName: Schema.nonEmptyString,
    surname: Schema.nonEmptyString,
    email: Schema.nonEmptyString,
    lastUpdated: Schema.nonEmptyString,
    created: Schema.nonEmptyString,
    userRoles: Schema.array(UserRolesModel),
    userGroups: Schema.array(NamedRefModel),
    organisationUnits: Schema.array(NamedRefModel),
    dataViewOrganisationUnits: Schema.array(NamedRefModel),
    lastLogin: Schema.nonEmptyString,
    disabled: Schema.boolean,
    access: AccessPermissionsModel
});
