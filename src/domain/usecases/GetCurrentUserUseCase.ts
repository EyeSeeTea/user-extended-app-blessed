import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { UserRepository } from "../repositories/UserRepository";

export class GetCurrentUserUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute(): FutureData<User> {
        return this.userRepository.getCurrent();
    }
}
