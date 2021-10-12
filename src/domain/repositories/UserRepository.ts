import { FutureData } from "../entities/Future";
import { PaginatedResponse } from "../entities/PaginatedResponse";
import { User } from "../entities/User";

export interface ListOptions {
    page?: number;
    pageSize?: number;
    search?: string;
    sorting?: { field: string; order: "asc" | "desc" };
    filters?: Record<string, any>;
}

export interface ListUsersFilters {
    dataViewOrganisationUnits?: string[];
    organisationUnits?: string[];
    userCredentialsDisabled?: string;
    userCredentials?: string[];
    userGroups?: string[];
}

export interface UserRepository {
    getCurrent(): FutureData<User>;
    list(options: ListOptions): FutureData<PaginatedResponse<User>>;
    getById(id: string): FutureData<User>;
}
