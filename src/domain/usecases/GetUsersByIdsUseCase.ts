import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { UserRepository } from "../repositories/UserRepository";

export class GetUsersByIdsUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute(ids: string[]): FutureData<User[]> {
        if (ids.length === 0) return Future.success([]);
        return this.userRepository.getByIds(ids);
    }
}
