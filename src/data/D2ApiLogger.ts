import _ from "lodash";
import { TrackerProgramLogger } from "@eyeseetea/d2-logger";
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
import { D2ApiTracker } from "./D2ApiTracker";

export class D2ApiLogger {
    private dataStorage: StorageClient;
    private d2ApiTracker: D2ApiTracker;

    constructor(private api: D2Api) {
        this.dataStorage = new DataStoreStorageClient("global", new Instance({ url: this.api.baseUrl }));
        this.d2ApiTracker = new D2ApiTracker(api);
    }

    buildLogger(user: User): FutureData<Maybe<D2LoggerMessage>> {
        return this.dataStorage.getObject<LoggerSettings>(Namespaces.LOGGER).flatMap(loggerSettings => {
            const orgUnitId = this.getOrgUnitIdFromUser(user);
            if (!orgUnitId) return Future.success(undefined);
            const loggerOptions = {
                orgUnitId: orgUnitId,
                isDebug: window.location.host.includes("localhost"),
                settings: loggerSettings,
            };
            return Future.fromPromise(setupLogger(this.api.baseUrl, loggerOptions))
                .flatMap(logger => {
                    if (!logger || !loggerSettings) return Future.success(undefined);
                    return this.getOrCreateTei(orgUnitId, user, loggerSettings, logger);
                })
                .flatMapError(error => {
                    console.warn(`Setup Logger error: ${error}`);
                    return Future.error(error);
                });
        });
    }

    private getOrCreateTei(
        orgUnitId: string,
        user: User,
        loggerSettings: LoggerSettings,
        logger: TrackerProgramLogger
    ): FutureData<Maybe<D2LoggerMessage>> {
        return this.d2ApiTracker
            .getOrCreate({
                data: { orgUnitId: orgUnitId, username: user.username },
                settings: loggerSettings,
            })
            .flatMap(teiResponse => {
                const loggerMessage = new D2LoggerMessage(
                    loggerSettings.dataElementFileId,
                    loggerSettings.dataElementDateTimeId,
                    teiResponse.trackedEntityId,
                    teiResponse.enrollmentId,
                    loggerSettings.programStageId,
                    logger,
                    this.api
                );
                return Future.success(loggerMessage);
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

export class D2LoggerMessage {
    private readonly logger: TrackerProgramLogger;
    private readonly trackedEntityId: Id;
    private readonly enrollmentId: Id;
    private readonly programStageId: Id;
    private readonly dataElementFileId: Id;
    private readonly dataElementDateTimeId: Id;

    constructor(
        dataElementId: Id,
        dataElementDateTimeId: Id,
        trackedEntityId: Id,
        enrollmentId: Id,
        programStageId: Id,
        logger: TrackerProgramLogger,
        private api: D2Api
    ) {
        this.trackedEntityId = trackedEntityId;
        this.enrollmentId = enrollmentId;
        this.programStageId = programStageId;
        this.logger = logger;
        this.dataElementFileId = dataElementId;
        this.dataElementDateTimeId = dataElementDateTimeId;
    }

    private async saveFileResource(options: D2FileLogger): Promise<string> {
        const { fileName, blob } = options;

        const formData = new FormData();
        formData.append("file", blob, fileName);
        formData.append("domain", "DATA_VALUE");

        const data = await this.api
            .request<PartialSaveResponse>({
                method: "post",
                url: "/fileResources",
                data: formData,
                requestBodyType: "raw",
            })
            .getData();

        if (!data.response || !data.response.fileResource || !data.response.fileResource.id) {
            throw new Error("Unable to store file, couldn't find resource");
        }

        return data.response.fileResource.id;
    }

    private convertObjectToBlob(data: object): Blob {
        const objectToString = JSON.stringify(data);
        const objectUint = new TextEncoder().encode(objectToString);
        return new Blob([objectUint], {
            type: "application/json;charset=utf-8",
        });
    }

    public async log(data: Object): Promise<void> {
        const blob = this.convertObjectToBlob(data);
        const fileResourceId = await this.saveFileResource({ blob: blob, fileName: `${new Date().getTime()}.json` });
        return this.logger.success({
            config: {
                enrollmentId: this.enrollmentId,
                programStageId: this.programStageId,
                trackedEntityId: this.trackedEntityId,
            },
            messages: [
                { id: this.dataElementFileId, value: fileResourceId },
                { id: this.dataElementDateTimeId, value: new Date().toISOString() },
            ],
        });
    }
}

type D2FileLogger = { blob: Blob; fileName: string };
type PartialSaveResponse = { response?: { fileResource?: { id?: string } } };
