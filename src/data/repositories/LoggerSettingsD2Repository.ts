import { FutureData } from "../../domain/entities/Future";
import { LoggerSettings } from "../../domain/entities/LoggerSettings";
import { LoggerSettingsRepository } from "../../domain/repositories/LoggerSettingsRepository";
import { Instance } from "../entities/Instance";
import { DataStoreStorageClient } from "../clients/storage/DataStoreStorageClient";
import { Namespaces } from "../clients/storage/Namespaces";

export class LoggerSettingsD2Repository implements LoggerSettingsRepository {
    private dataStorage: DataStoreStorageClient;

    constructor(instance: Instance) {
        this.dataStorage = new DataStoreStorageClient("global", instance);
    }

    get(): FutureData<LoggerSettings> {
        const $request = this.dataStorage.getOrCreateObject<LoggerSettings>(
            Namespaces.LOGGER,
            LoggerSettings.create({
                isEnabled: false,
                programId: "",
                messageFileId: "",
                programStageId: "",
                usernameAttributeId: "",
            })
        );
        return $request.map(settings => settings);
    }

    save(settings: LoggerSettings): FutureData<void> {
        return this.dataStorage.saveObject(Namespaces.LOGGER, settings);
    }
}
