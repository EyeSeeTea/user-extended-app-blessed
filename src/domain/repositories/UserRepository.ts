import { MetadataResponse } from "@eyeseetea/d2-api/2.34";
import { FutureData } from "../entities/Future";
import { PaginatedResponse } from "../entities/PaginatedResponse";
import { User } from "../entities/User";

export interface UserRepository {
    getCurrent(): FutureData<User>;
    list(options: ListOptions): FutureData<PaginatedResponse<User>>;
    listAllIds(options: ListOptions): FutureData<string[]>;
    getById(id: string): FutureData<User>;
    save(users: User[]): FutureData<MetadataResponse>;
    getColumns(): FutureData<string[]>;
    saveColumns(columns: string[]): FutureData<void>;
}

export interface ListOptions {
    page?: number;
    pageSize?: number;
    search?: string;
    sorting?: { field: string; order: "asc" | "desc" };
    filters?: ListFilters;
}

export type ListFilterType = "in" | "eq";
export type ListFilters = Record<string, [ListFilterType, string[]]>;
