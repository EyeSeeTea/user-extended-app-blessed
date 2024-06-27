import { Either } from "./Either";
import { Struct } from "./generic/Struct";
import { Id } from "./Ref";

export type LoggerSettingsAttrs = {
    isEnabled: boolean;
    programId: Id;
    programStageId: Id;
    messageFileId: Id;
    usernameAttributeId: Id;
};

export class LoggerSettings extends Struct<LoggerSettingsAttrs>() {
    static build(data: LoggerSettingsAttrs): Either<Error, LoggerSettings> {
        if (!data.programId || !data.messageFileId || !data.programStageId || !data.usernameAttributeId) {
            return Either.error(
                new Error("Program ID, program stage, user attribute and Message File ID are required")
            );
        }

        return Either.success(LoggerSettings.create(data));
    }
}
