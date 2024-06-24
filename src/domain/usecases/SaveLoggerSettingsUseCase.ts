import { FutureData } from "../entities/Future";
import { LoggerSettings } from "../entities/LoggerSettings";
import { LoggerSettingsRepository } from "../repositories/LoggerSettingsRepository";

export class SaveLoggerSettingsUseCase {
    constructor(private loggerSettings: LoggerSettingsRepository) {}

    execute(loggerSettings: LoggerSettings): FutureData<void> {
        return this.loggerSettings.save(loggerSettings);
    }
}
