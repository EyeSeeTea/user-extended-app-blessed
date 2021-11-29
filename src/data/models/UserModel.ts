import { User, AccessPermissions } from "../../domain/entities/User";
import { Codec, Schema } from "../../utils/codec";
import { D2ApiUser } from "../repositories/UserD2ApiRepository";
import { NamedRefModel } from "./DHIS2Model";

export const AccessPermissionsModel: Codec<AccessPermissions> = Schema.object({
    read: Schema.optionalSafe(Schema.boolean, false),
    update: Schema.optionalSafe(Schema.boolean, false),
    externalize: Schema.optionalSafe(Schema.boolean, false),
    delete: Schema.optionalSafe(Schema.boolean, false),
    write: Schema.optionalSafe(Schema.boolean, false),
    manage: Schema.optionalSafe(Schema.boolean, false),
});

const dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS";

export const UserModel: Codec<User> = Schema.object({
    id: Schema.nonEmptyString,
    name: Schema.nonEmptyString,
    username: Schema.nonEmptyString,
    firstName: Schema.nonEmptyString,
    surname: Schema.nonEmptyString,
    email: Schema.string,
    lastUpdated: Schema.stringDate(dateFormat),
    created: Schema.stringDate(dateFormat),
    apiUrl: Schema.nonEmptyString,
    userRoles: Schema.array(NamedRefModel),
    userGroups: Schema.array(NamedRefModel),
    organisationUnits: Schema.array(NamedRefModel),
    dataViewOrganisationUnits: Schema.array(NamedRefModel),
    lastLogin: Schema.optional(Schema.stringDate(dateFormat)),
    disabled: Schema.boolean,
    access: AccessPermissionsModel,
    authorities: Schema.array(Schema.nonEmptyString),
    openId: Schema.optional(Schema.string),
});

export const ApiUserModel: Codec<D2ApiUser> = Schema.object({
    id: Schema.string,
    name: Schema.string,
    firstName: Schema.string,
    surname: Schema.string,
    email: Schema.optionalSafe(Schema.string, ""),
    lastUpdated: Schema.string,
    created: Schema.string,
    userGroups: Schema.array(NamedRefModel),
    organisationUnits: Schema.array(NamedRefModel),
    dataViewOrganisationUnits: Schema.array(NamedRefModel),
    access: AccessPermissionsModel,
    userCredentials: Schema.object({
        username: Schema.string,
        userRoles: Schema.array(
            Schema.object({
                id: Schema.string,
                name: Schema.string,
                authorities: Schema.array(Schema.string),
            })
        ),
        lastLogin: Schema.optionalSafe(Schema.string, ""),
        disabled: Schema.boolean,
        openId: Schema.optionalSafe(Schema.string, ""),
    }),
});
