import { MetadataResponse } from "@eyeseetea/d2-api/2.36";
import { FutureData } from "../entities/Future";
import { PaginatedResponse } from "../entities/PaginatedResponse";
import { NamedRef } from "../entities/Ref";
import { Stats } from "../entities/Stats";
import { User } from "../entities/User";

export interface UserRepository {
    getCurrent(): FutureData<User>;
    list(options: ListOptions): FutureData<PaginatedResponse<User>>;
    listAllIds(options: ListOptions): FutureData<string[]>;
    getByIds(ids: string[]): FutureData<User[]>;
    save(users: User[]): FutureData<MetadataResponse>;
    updateRoles(ids: string[], update: NamedRef[], strategy: UpdateStrategy): FutureData<MetadataResponse>;
    updateGroups(ids: string[], update: NamedRef[], strategy: UpdateStrategy): FutureData<MetadataResponse>;
    getColumns(): FutureData<Array<keyof User>>;
    saveColumns(columns: Array<keyof User>): FutureData<void>;
    remove(users: User[]): FutureData<Stats>;
}

export interface ListOptions {
    page?: number;
    pageSize?: number;
    search?: string;
    sorting?: { field: string; order: "asc" | "desc" };
    filters?: ListFilters;
    canManage?: string;
    rootJunction?: "AND" | "OR";
}

export type ListFilterType = "in" | "eq";
export type ListFilters = Record<string, [ListFilterType, string[]]>;
export type UpdateStrategy = "replace" | "merge";
