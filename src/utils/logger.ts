import { TrackerProgramLogger, initLogger } from "@eyeseetea/d2-logger";
import { LoggerSettings } from "../domain/entities/LoggerSettings";
import { Id } from "../domain/entities/Ref";
import { Maybe } from "../types/utils";

export const GLOBAL_ORG_UNIT_CODE = "WHO-HQ";

export type LoggerOptions = {
    isDebug: boolean;
    orgUnitId: Id;
    settings: Maybe<LoggerSettings>;
};

export async function setupLogger(baseUrl: string, options: LoggerOptions): Promise<Maybe<TrackerProgramLogger>> {
    if (!options.settings?.isEnabled) return undefined;

    const logger = await initLogger({
        type: "trackerProgram",
        debug: options.isDebug,
        baseUrl: baseUrl,
        auth: undefined,
        trackerProgramId: options.settings.programId,
        messageTypeId: undefined,
    });
    return logger;
}
