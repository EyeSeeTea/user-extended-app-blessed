import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { UserRepository } from "../repositories/UserRepository";

export class SaveColumnsUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    execute(columns: string[]): FutureData<void> {
        return this.userRepository.saveColumns(columns);
    }
}
