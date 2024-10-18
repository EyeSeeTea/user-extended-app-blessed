import { GetType } from "purify-ts";
import { NamedRef, Ref } from "../../domain/entities/Ref";
import { Codec, Schema } from "../../utils/codec";

export const RefModel: Codec<Ref> = Schema.object({
    id: Schema.string,
});

export const NamedRefModel: Codec<NamedRef> = Schema.object({
    id: Schema.string,
    name: Schema.optionalSafe(Schema.string, "Unknown"),
});

export const OrgUnitModel = Schema.object({
    id: Schema.string,
    name: Schema.string,
    code: Schema.optionalSafe(Schema.string, ""),
    path: Schema.string,
});

export type ApiD2OrgUnit = GetType<typeof OrgUnitModel>;
