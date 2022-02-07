import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { NamedRef } from "../entities/Ref";
import { UpdateStrategy, UserRepository } from "../repositories/UserRepository";
import { MetadataResponse } from "@eyeseetea/d2-api/2.34";

export class UpdateUsersRolesUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute(
        usersToUpdate: User[],
        rolesToUpdate: NamedRef[],
        updateStrategy: UpdateStrategy
    ): FutureData<MetadataResponse> {
        return this.userRepository.updateRoles(usersToUpdate, rolesToUpdate, updateStrategy);
    }
}
