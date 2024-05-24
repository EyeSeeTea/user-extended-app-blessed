import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { UserRepository } from "../repositories/UserRepository";

export class SaveUserStatusUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute(users: User[], options: SaveUserStatusOptions): FutureData<void> {
        const usersToUpdate = users.map(user => {
            return { ...user, disabled: options.disabled };
        });
        return this.userRepository.save(usersToUpdate).toVoid();
    }
}

type SaveUserStatusOptions = { disabled: boolean };
