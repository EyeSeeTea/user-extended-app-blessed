import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { MetadataRepository } from "../repositories/MetadataRepository";

export class GetOrgUnitPathsUseCase implements UseCase {
    constructor(private metadataRepository: MetadataRepository) {}

    public execute(ids: string[]): FutureData<{ id: string; name: string; path: string }[]> {
        return this.metadataRepository.getOrgUnitPathsByIds(ids);
    }
}
