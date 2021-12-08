import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { UserRepository } from "../repositories/UserRepository";

export class GetUserByIdUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute(id: string): FutureData<User> {
        return this.userRepository.getById(id);
    }
}
