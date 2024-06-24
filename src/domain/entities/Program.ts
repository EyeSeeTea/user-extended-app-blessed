import { Struct } from "./generic/Struct";
import { Id } from "./Ref";

export type ProgramAttrs = { id: Id; name: string; dataElements: DataElementAttrs[] };
export type DataElementAttrs = { id: Id; name: string };

export class Program extends Struct<ProgramAttrs>() {}
