import { User } from "../entities/User";
import { UserRepository } from "../repositories/UserRepository";

export class RemoveUsersUseCase {
    constructor(private userRepository: UserRepository) {}

    execute(users: User[]) {
        return this.userRepository.remove(users);
    }
}
