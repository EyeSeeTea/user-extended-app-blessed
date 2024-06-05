import { Id } from "./Ref";

export type OrgUnit = { id: Id; name: string; code: string; path: string[] };

export type OrgUnitKey = keyof OrgUnit;
