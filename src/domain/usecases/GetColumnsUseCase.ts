import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { UserRepository } from "../repositories/UserRepository";

export class GetColumnsUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    execute(): FutureData<Array<keyof User>> {
        return this.userRepository.getColumns();
    }
}
