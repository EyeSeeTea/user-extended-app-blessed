import _ from "lodash";
import { FutureData } from "../../domain/entities/Future";
import { Instance } from "../entities/Instance";
import { Metadata, MetadataType, MetadataPackage } from "../../domain/entities/Metadata";
import { MetadataRepository } from "../../domain/repositories/MetadataRepository";
import { D2Api, Pager } from "@eyeseetea/d2-api/2.34";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";

export class MetadataD2ApiRepository implements MetadataRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    public list(
        type: MetadataType,
        options: { pageSize?: number; page?: number; filter?: string },
        fieldOptions: {}
    ): FutureData<{ pager: Pager; objects: Metadata[] }> {
        //, authorities: true
        return apiToFuture(
            //@ts-ignore
            this.api.models[type].get({
                filter: options.filter ? { identifiable: { token: options.filter } } : undefined,
                fields: { ...fieldOptions, id: true, name: true, code: true },
                paging: false,
                //pageSize: options.pageSize ?? 25,
                //page: options.page ?? 1,
            })
        );
    }

    public listAll(
        types: MetadataType[],
        fields = { id: true, name: true, code: true },
        filter?: string
    ): FutureData<MetadataPackage> {
        const params = _.zipObject(
            types,
            types.map(() => ({ fields, filter }))
        );

        return apiToFuture(this.api.metadata.get(params));
    }
}
