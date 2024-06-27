import _ from "lodash";
import { TrackerProgramLogger } from "@eyeseetea/d2-logger";
import { isDev } from "..";
import { Future, FutureData } from "../domain/entities/Future";
import { LoggerSettings } from "../domain/entities/LoggerSettings";
import { User } from "../domain/entities/User";
import { D2Api } from "../types/d2-api";
import { Maybe } from "../types/utils";

import { setupLogger } from "../utils/logger";
import { DataStoreStorageClient } from "./clients/storage/DataStoreStorageClient";
import { Namespaces } from "./clients/storage/Namespaces";
import { StorageClient } from "./clients/storage/StorageClient";
import { Instance } from "./entities/Instance";
import { Id } from "../domain/entities/Ref";

export class D2ApiLogger {
    private dataStorage: StorageClient;

    constructor(private api: D2Api) {
        this.dataStorage = new DataStoreStorageClient("global", new Instance({ url: this.api.baseUrl }));
    }

    buildLogger(user: User): FutureData<Maybe<TrackerProgramLogger>> {
        return Future.joinObj({
            loggerSettings: this.dataStorage.getObject<LoggerSettings>(Namespaces.LOGGER),
        }).flatMap(({ loggerSettings }) => {
            const orgUnitId = this.getOrgUnitIdFromUser(user);
            if (!orgUnitId) return Future.success(undefined);

            return Future.fromPromise(
                setupLogger(this.api.baseUrl, { orgUnitId: orgUnitId, isDebug: isDev, settings: loggerSettings })
            ).flatMapError(error => {
                console.warn(`Setup Logger error: ${error}`);
                return Future.error(error);
            });
        });
    }

    private getOrgUnitIdFromUser(user: User): Maybe<Id> {
        const sortOrgUnitsByLevel = _(user.organisationUnits)
            .orderBy(orgUnit => [orgUnit.level, orgUnit.name])
            .value();
        const firstOrgUnit = _(sortOrgUnitsByLevel).first();
        if (!firstOrgUnit) {
            console.warn(`Cannot found org. unit for user ${user.username}`);
            return undefined;
        }

        return firstOrgUnit.id;
    }
}
