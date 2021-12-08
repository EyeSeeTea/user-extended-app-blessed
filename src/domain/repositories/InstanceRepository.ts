import { FutureData } from "../entities/Future";

export interface InstanceRepository {
    getBaseUrl(): string;
    getInstanceVersion(): FutureData<string>;
}
