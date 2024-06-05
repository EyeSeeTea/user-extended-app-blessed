import { FutureData } from "../../domain/entities/Future";
import { Instance } from "../entities/Instance";
import { Metadata, MetadataType } from "../../domain/entities/Metadata";
import { MetadataRepository } from "../../domain/repositories/MetadataRepository";
import { D2Api, Pager } from "@eyeseetea/d2-api/2.36";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { OrgUnit } from "../../domain/entities/OrgUnit";

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
        return apiToFuture(
            //@ts-ignore
            this.api.models[type].get({
                filter: options.filter ? { identifiable: { token: options.filter } } : undefined,
                fields: { ...fieldOptions, id: true, name: true, code: true },
                paging: false,
            })
        );
    }

    public getOrgUnitPathsByIds(ids: string[]): FutureData<OrgUnit[]> {
        return apiToFuture(
            this.api.models.organisationUnits.get({
                fields: { id: true, name: true, code: true, path: true },
                filter: { id: { in: ids } },
                paging: false,
            })
        ).map(({ objects }) => {
            return objects.map(d2OrgUnit => {
                return { ...d2OrgUnit, path: d2OrgUnit.path.split("/").slice(1) };
            });
        });
    }
}
