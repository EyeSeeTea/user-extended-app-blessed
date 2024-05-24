import { Pager } from "../../types/d2-api";
import { FutureData } from "../entities/Future";
import { Metadata, MetadataType } from "../entities/Metadata";
import { OrgUnit } from "../entities/OrgUnit";

export interface MetadataRepository {
    list(type: MetadataType, options: ListOptions, fieldOptions: {}): FutureData<{ pager: Pager; objects: Metadata[] }>;
    getOrgUnitPathsByIds(ids: string[]): FutureData<OrgUnit[]>;
}

export type ListOptions = { pageSize?: number; page?: number; filter?: string };
