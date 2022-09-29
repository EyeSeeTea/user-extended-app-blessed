import { Pager } from "../../types/d2-api";
import { FutureData } from "../entities/Future";
import { Metadata, MetadataType } from "../entities/Metadata";

export interface MetadataRepository {
    list(type: MetadataType, options: ListOptions, fieldOptions: {}): FutureData<{ pager: Pager; objects: Metadata[] }>;
    getOrgUnitPathsByIds(ids: string[]): FutureData<{ id: string; name: string; path: string }[]>;
}

export type ListOptions = { pageSize?: number; page?: number; filter?: string };
