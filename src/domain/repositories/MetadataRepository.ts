import { Pager } from "../../types/d2-api";
import { FutureData } from "../entities/Future";
import { Metadata, MetadataType } from "../entities/Metadata";

export interface MetadataRepository {
    list(type: MetadataType, options: ListOptions, fieldOptions: {}): FutureData<{ pager: Pager; objects: Metadata[] }>;
}

export type ListOptions = { pageSize?: number; page?: number; filter?: string };
