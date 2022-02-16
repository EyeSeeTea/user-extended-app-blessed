import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { MetadataResponse } from "../entities/Metadata";
import { NamedRef } from "../entities/Ref";
import { UpdateStrategy, UserRepository } from "../repositories/UserRepository";

export class UpdateUserPropUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute(
        prop: "userRoles" | "userGroups",
        ids: string[],
        roles: NamedRef[],
        strategy: UpdateStrategy
    ): FutureData<MetadataResponse> {
        switch (prop) {
            case "userRoles":
                return this.userRepository.updateRoles(ids, roles, strategy);
            case "userGroups":
                return this.userRepository.updateGroups(ids, roles, strategy);
            default:
                throw new Error(`Unknown property: ${prop}`);
        }
    }
}
