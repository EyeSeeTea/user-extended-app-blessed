import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { UserRepository } from "../repositories/UserRepository";

export class GetUsersByIdUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute(ids: string[]): FutureData<User[]> {
        return this.userRepository.getByIds(ids);
    }
}
