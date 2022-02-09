import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { UserRepository } from "../repositories/UserRepository";

export class GetColumnsUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    execute(): FutureData<string[]> {
        return this.userRepository.getColumns();
    }
}
