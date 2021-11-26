import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { ListOptions, UserRepository } from "../repositories/UserRepository";

export class ListAllUserIdsUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute(options: ListOptions): FutureData<string[]> {
        return this.userRepository.listAllIds(options);
    }
}
