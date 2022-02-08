import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { MetadataResponse } from "../entities/Metadata";
import { NamedRef } from "../entities/Ref";
import { UpdateStrategy, UserRepository } from "../repositories/UserRepository";

export class UpdateUsersRolesUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute(ids: string[], roles: NamedRef[], strategy: UpdateStrategy): FutureData<MetadataResponse> {
        return this.userRepository.updateRoles(ids, roles, strategy);
    }
}
