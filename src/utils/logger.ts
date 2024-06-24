import { ProgramLogger, initLogger } from "@eyeseetea/d2-logger";
import { LoggerSettings } from "../domain/entities/LoggerSettings";
import { Id } from "../domain/entities/Ref";
import { Maybe } from "../types/utils";

export const GLOBAL_ORG_UNIT_CODE = "WHO-HQ";

export type LoggerOptions = {
    isDebug: boolean;
    orgUnitId: Id;
    settings: Maybe<LoggerSettings>;
};

export async function setupLogger(baseUrl: string, options: LoggerOptions): Promise<Maybe<ProgramLogger>> {
    if (!options.settings?.isEnabled) return undefined;

    const logger = await initLogger({
        type: "program",
        debug: options.isDebug,
        baseUrl: baseUrl,
        auth: undefined,
        organisationUnitId: options.orgUnitId,
        programId: options.settings.programId,
        dataElements: { messageId: options.settings.messageId, messageTypeId: options.settings.messageTypeId },
    });
    return logger;
}
