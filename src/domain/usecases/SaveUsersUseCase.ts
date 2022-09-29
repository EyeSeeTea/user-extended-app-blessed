import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { UserRepository } from "../repositories/UserRepository";
import { MetadataResponse } from "@eyeseetea/d2-api/2.36";

export class SaveUsersUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute(usersToSave: User[]): FutureData<MetadataResponse> {
        return this.userRepository.save(usersToSave);
    }
}
