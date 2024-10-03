import { FutureData } from "../entities/Future";
import { LoggerSettings } from "../entities/LoggerSettings";

export interface LoggerSettingsRepository {
    get(): FutureData<LoggerSettings>;
    save(settings: LoggerSettings): FutureData<void>;
}
