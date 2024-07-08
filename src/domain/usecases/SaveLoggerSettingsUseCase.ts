import i18n from "../../locales";
import { Future, FutureData } from "../entities/Future";
import { LoggerSettings } from "../entities/LoggerSettings";
import { isSuperAdmin, User } from "../entities/User";
import { LoggerSettingsRepository } from "../repositories/LoggerSettingsRepository";

export class SaveLoggerSettingsUseCase {
    constructor(private loggerSettings: LoggerSettingsRepository) {}

    execute(loggerSettings: LoggerSettings, user: User): FutureData<void> {
        if (isSuperAdmin(user)) {
            return this.loggerSettings.save(loggerSettings);
        } else {
            return Future.error(i18n.t("Only admin user can edit logger settings"));
        }
    }
}
