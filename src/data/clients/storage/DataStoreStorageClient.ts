import { Future, FutureData } from "../../../domain/entities/Future";
import { D2Api, DataStore } from "../../../types/d2-api";
import { getD2APiFromInstance } from "../../../utils/d2-api";
import { apiToFuture } from "../../../utils/futures";
import { Instance } from "../../entities/Instance";
import { dataStoreNamespace } from "./Namespaces";
import { StorageClient } from "./StorageClient";

export class DataStoreStorageClient extends StorageClient {
    private api: D2Api;
    private dataStore: DataStore;

    constructor(type: "user" | "global", instance: Instance) {
        super();
        this.api = getD2APiFromInstance(instance);
        this.dataStore =
            type === "user" ? this.api.userDataStore(dataStoreNamespace) : this.api.dataStore(dataStoreNamespace);
    }

    public getObject<T extends object>(key: string): FutureData<T | undefined> {
        return apiToFuture(this.dataStore.get<T>(key));
    }

    public getOrCreateObject<T extends object>(key: string, defaultValue: T): FutureData<T> {
        return this.getObject<T>(key).flatMap(value => {
            if (!value) return this.saveObject(key, defaultValue).map(() => defaultValue);
            return Future.success(value);
        });
    }

    public saveObject<T extends object>(key: string, value: T): FutureData<void> {
        return apiToFuture(this.dataStore.save(key, value)).map(() => undefined);
    }

    public removeObject(key: string): FutureData<void> {
        return apiToFuture(this.dataStore.delete(key)).map(() => undefined);
    }
}
