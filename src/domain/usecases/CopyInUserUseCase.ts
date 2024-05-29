import _ from "lodash";

import { FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { AccessElements, UpdateStrategy, AccessElementsKeys, UserRepository } from "../repositories/UserRepository";
import { Id } from "../entities/Ref";

export class CopyInUserUseCase {
    constructor(private userRepository: UserRepository) {}

    public execute(options: CopyInUserOptions): FutureData<void> {
        return this.getUsersToUpdate(options.selectedUsersIds).flatMap(usersToUpdate => {
            const usersToSave = this.applyCopyToUsers(usersToUpdate, options);
            return this.saveUsers(usersToSave);
        });
    }

    private applyCopyToUsers(usersToUpdate: User[], options: CopyInUserOptions): User[] {
        return usersToUpdate.map(userToUpdate => this.updateUser(userToUpdate, options));
    }

    private getUsersToUpdate(selectedUsersIds: Id[]): FutureData<User[]> {
        return this.userRepository.getByIds(selectedUsersIds);
    }

    private replaceAccessElementsKeys(targetUser: User, sourceUser: User, properties: AccessElementsKeys[]): User {
        return { ...targetUser, ..._.pick(sourceUser, properties) };
    }

    private mergeAccessElementsKeys(targetUser: User, sourceUser: User, properties: AccessElementsKeys[]): User {
        const pickedSource = _.pick(sourceUser, properties);

        // Custom merge logic to handle arrays
        const customizer = (objValue: User[AccessElementsKeys], srcValue: User[AccessElementsKeys]) =>
            _.unionWith(objValue, srcValue, _.isEqual);

        // Merge the picked properties into the target user using the custom merge function
        return _.mergeWith(targetUser, pickedSource, customizer);
    }

    private updateUser(targetUser: User, options: CopyInUserOptions): User {
        const sourceUser = options.user;
        // Filter and get keys names of selected user properties to update
        const propertiesToUpdate = _(options.accessElements)
            .pickBy(isSelected => isSelected === true)
            .keys()
            .value() as AccessElementsKeys[];

        switch (options.updateStrategy) {
            case "replace":
                return this.replaceAccessElementsKeys(targetUser, sourceUser, propertiesToUpdate);
            case "merge":
                return this.mergeAccessElementsKeys(targetUser, sourceUser, propertiesToUpdate);
        }
    }

    private saveUsers(users: User[]): FutureData<void> {
        return this.userRepository.save(users).toVoid();
    }
}

export type CopyInUserOptions = {
    user: User;
    selectedUsersIds: Id[];
    updateStrategy: UpdateStrategy;
    accessElements: AccessElements;
};
