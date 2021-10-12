import { FutureData } from "../entities/Future";
import { Settings } from "../entities/Settings";

export interface SettingsRepository {
    getByName(name: string): FutureData<string>;
    list(): FutureData<Settings>;
    update(fields: string[]): FutureData<Settings>;
    save(): FutureData<Settings>;
}
