import { Id, NamedRef, Ref } from "../../domain/entities/Ref";
import { Codec, Schema } from "../../utils/codec";

export const RefModel: Codec<Ref> = Schema.object({
    id: Schema.string,
});

export const NamedRefModel: Codec<NamedRef> = Schema.object({
    id: Schema.string,
    name: Schema.optionalSafe(Schema.string, "Unknown"),
});

export type ApiD2OrgUnit = {
    id: Id;
    name: string;
    path: string;
};

export const OrgUnitModel: Codec<ApiD2OrgUnit> = Schema.object({
    id: Schema.string,
    name: Schema.string,
    path: Schema.string,
});
