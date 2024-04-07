import _ from "lodash";

import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
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
        const isCaptureOrgUnit = options.orgUnitType === "capture";
        return options.users.map(user => {
            const orgUnits = this.getOrgUnits(
                options,
                isCaptureOrgUnit ? user.organisationUnits : user.dataViewOrganisationUnits
            );

            const userOrgUnits: Partial<User> = isCaptureOrgUnit
                ? { organisationUnits: orgUnits }
                : { dataViewOrganisationUnits: orgUnits };

            return { ...user, ...userOrgUnits };
        });
    }

    private getOrgUnits(options: SaveUserOrgUnitOptions, organisationUnits: OrgUnit[]): OrgUnit[] {
        switch (options.updateStrategy) {
            case "replace":
                return options.orgUnitsIds.map(orgUnitId => ({ id: orgUnitId, name: "", path: "" }));
            case "merge":
                return _(options.orgUnitsIds)
                    .map(orgUnitId => ({ id: orgUnitId, name: "", path: "" }))
                    .concat(organisationUnits)
                    .uniqBy(orgUnit => orgUnit.id)
                    .value();
            default:
                throw Error(`Invalid UpdateStrategy: ${options.updateStrategy}`);
        }
    }

    private saveUsers(users: User[]): FutureData<void> {
        return this.userRepository.save(users).map(() => undefined);
    }
}

export type SaveUserOrgUnitOptions = {
    orgUnitsIds: Id[];
    updateStrategy: UpdateStrategy;
    users: User[];
    orgUnitType: "capture" | "output";
};
