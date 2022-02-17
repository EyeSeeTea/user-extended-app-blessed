import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { MetadataResponse } from "../entities/Metadata";
import { NamedRef } from "../entities/Ref";
import { UpdateStrategy, UserRepository } from "../repositories/UserRepository";

export class UpdateUsersGroupsUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute(ids: string[], groups: NamedRef[], strategy: UpdateStrategy): FutureData<MetadataResponse> {
        return this.userRepository.updateGroups(ids, groups, strategy);
    }
}
