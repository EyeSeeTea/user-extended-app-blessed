import { OrgUnit } from "../../domain/entities/OrgUnit";
import { NamedRef, Ref } from "../../domain/entities/Ref";
import { Codec, Schema } from "../../utils/codec";

export const RefModel: Codec<Ref> = Schema.object({
    id: Schema.string,
});

export const NamedRefModel: Codec<NamedRef> = Schema.object({
    id: Schema.string,
    name: Schema.optionalSafe(Schema.string, "Unknown"),
});

export const OrgUnitModel: Codec<OrgUnit> = Schema.object({
    id: Schema.string,
    name: Schema.optionalSafe(Schema.string, "Unknown"),
    path: Schema.optionalSafe(Schema.string, "Unknown"),
});
