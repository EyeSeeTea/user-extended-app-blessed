import { Pager } from "@eyeseetea/d2-ui-components";
import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { UserRepository, ListOptions } from "../repositories/UserRepository";

export class ListUsersUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute(options: ListOptions): FutureData<{ pager: Pager; objects: User[] }> {
        return this.userRepository.list(options);
    }
}
