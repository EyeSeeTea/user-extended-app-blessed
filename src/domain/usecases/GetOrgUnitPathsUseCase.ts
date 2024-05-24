import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { OrgUnit } from "../entities/OrgUnit";
import { MetadataRepository } from "../repositories/MetadataRepository";

export class GetOrgUnitPathsUseCase implements UseCase {
    constructor(private metadataRepository: MetadataRepository) {}

    public execute(ids: string[]): FutureData<OrgUnit[]> {
        return this.metadataRepository.getOrgUnitPathsByIds(ids);
    }
}
