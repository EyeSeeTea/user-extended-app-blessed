import { FutureData } from "../entities/Future";
import { PaginatedResponse } from "../entities/PaginatedResponse";
import { User } from "../entities/User";

export interface UserRepository {
    getCurrent(): FutureData<User>;
    list(): FutureData<PaginatedResponse<User>>;
    getById(id: string): FutureData<User>;
}
