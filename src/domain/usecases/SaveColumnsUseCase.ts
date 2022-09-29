import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { UserRepository } from "../repositories/UserRepository";

export class SaveColumnsUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    execute(columns: Array<keyof User>): FutureData<void> {
        return this.userRepository.saveColumns(columns);
    }
}
