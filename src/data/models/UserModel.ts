import { AccessPermissions } from "../../domain/entities/User";
import { Codec, Schema } from "../../utils/codec";
import { ApiUser } from "../repositories/UserD2ApiRepository";
import { NamedRefModel, OrgUnitModel } from "./DHIS2Model";

export const AccessPermissionsModel: Codec<AccessPermissions> = Schema.object({
    read: Schema.optionalSafe(Schema.boolean, false),
    update: Schema.optionalSafe(Schema.boolean, false),
    externalize: Schema.optionalSafe(Schema.boolean, false),
    delete: Schema.optionalSafe(Schema.boolean, false),
    write: Schema.optionalSafe(Schema.boolean, false),
    manage: Schema.optionalSafe(Schema.boolean, false),
});

export const ApiUserModel: Codec<ApiUser> = Schema.object({
    id: Schema.string,
    name: Schema.string,
    firstName: Schema.string,
    surname: Schema.string,
    email: Schema.optionalSafe(Schema.string, ""),
    phoneNumber: Schema.optionalSafe(Schema.string, ""),
    whatsApp: Schema.optionalSafe(Schema.string, ""),
    facebookMessenger: Schema.optionalSafe(Schema.string, ""),
    skype: Schema.optionalSafe(Schema.string, ""),
    telegram: Schema.optionalSafe(Schema.string, ""),
    twitter: Schema.optionalSafe(Schema.string, ""),
    lastUpdated: Schema.string,
    created: Schema.string,
    userGroups: Schema.array(NamedRefModel),
    organisationUnits: Schema.array(OrgUnitModel),
    dataViewOrganisationUnits: Schema.array(OrgUnitModel),
    teiSearchOrganisationUnits: Schema.array(OrgUnitModel),
    access: AccessPermissionsModel,
    userCredentials: Schema.object({
        id: Schema.string,
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
        ldapId: Schema.optionalSafe(Schema.string, ""),
        externalAuth: Schema.boolean,
        password: Schema.string,
        accountExpiry: Schema.optionalSafe(Schema.string, ""),
    }),
});
