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
        //const { paging = true } = options;
        return this.metadataRepository.list(type, options, fields);

        /* console.log(options)
        if (paging) {
            return this.metadataRepository.list(type, options, fields);
        } else {
            return this.metadataRepository.listAll([type], fields, options.filter).map(metadata => ({
                pager: { page: 1, pageCount: 1, pageSize: metadata[type]?.length, total: metadata[type]?.length },
                objects: metadata[type] ?? [],
            }));
        }*/
    }
}
