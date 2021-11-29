import { UseCase } from "../../CompositionRoot";
import { Pager } from "@eyeseetea/d2-api/2.34";
import { FutureData } from "../entities/Future";
import { Metadata, MetadataType } from "../entities/Metadata";
import { ListOptions, MetadataRepository } from "../repositories/MetadataRepository";

export class ListMetadataUseCase implements UseCase {
    constructor(private metadataRepository: MetadataRepository) {}

    public execute(
        type: MetadataType,
        options: ListOptions & { paging?: boolean } = {},
        fields: {} = {}
    ): FutureData<{ pager: Pager; objects: Metadata[] }> {
        return this.metadataRepository.list(type, options, fields);
    }
}
