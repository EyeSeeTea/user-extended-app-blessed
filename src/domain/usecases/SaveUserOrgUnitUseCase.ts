import _ from "lodash";

import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { User } from "../entities/User";
import { UpdateStrategy, UserRepository } from "../repositories/UserRepository";
import { Id } from "../entities/Ref";
import { OrgUnit } from "../entities/OrgUnit";

export class SaveUserOrgUnitUseCase implements UseCase {
    constructor(private userRepository: UserRepository) {}

    public execute(options: SaveUserOrgUnitOptions): FutureData<void> {
        const usersToSave = this.applyOrgUnitsToUsers(options);
        return this.saveUsers(usersToSave);
    }

    private applyOrgUnitsToUsers(options: SaveUserOrgUnitOptions): User[] {
        const orgUnitKey = this.getOrgUnitKey(options);
        return options.users.map(user => {
            return {
                ...user,
                [orgUnitKey]: this.getOrgUnits(
                    options,
                    orgUnitKey === "organisationUnits" ? user.organisationUnits : user.dataViewOrganisationUnits
                ),
            };
        });
    }

    private getOrgUnitKey(options: SaveUserOrgUnitOptions): keyof User {
        return options.orgUnitType === "capture" ? "organisationUnits" : "dataViewOrganisationUnits";
    }

    private getOrgUnits(options: SaveUserOrgUnitOptions, organisationUnits: OrgUnit[]): OrgUnit[] {
        if (options.updateStrategy === "replace") {
            return options.orgUnitsIds.map(orgUnitId => ({ id: orgUnitId, name: "", path: "" }));
        } else if (options.updateStrategy === "merge") {
            return _(options.orgUnitsIds)
                .map(orgUnitId => ({ id: orgUnitId, name: "", path: "" }))
                .concat(organisationUnits)
                .uniqBy(orgUnit => orgUnit.id)
                .value();
        } else {
            throw Error(`Invalid UpdateStrategy: ${options.updateStrategy}`);
        }
    }

    private saveUsers(users: User[]): FutureData<void> {
        return this.userRepository.save(users).flatMap(() => Future.success(undefined));
    }
}

export type SaveUserOrgUnitOptions = {
    orgUnitsIds: Id[];
    updateStrategy: UpdateStrategy;
    users: User[];
    orgUnitType: "capture" | "output";
};
