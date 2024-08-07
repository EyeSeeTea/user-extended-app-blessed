import { FutureData } from "../entities/Future";
import { LoggerSettings } from "../entities/LoggerSettings";
import { LoggerSettingsRepository } from "../repositories/LoggerSettingsRepository";

export class GetLoggerSettingsUseCase {
    constructor(private loggerSettings: LoggerSettingsRepository) {}

    execute(): FutureData<LoggerSettings> {
        return this.loggerSettings.get();
    }
}
