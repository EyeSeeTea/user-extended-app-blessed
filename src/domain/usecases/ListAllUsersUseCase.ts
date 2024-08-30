import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { UserRepository, ListOptions } from "../repositories/UserRepository";

export class ListAllUsersUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute(options: ListOptions): FutureData<User[]> {
        return this.userRepository.listAll(options);
    }
}
