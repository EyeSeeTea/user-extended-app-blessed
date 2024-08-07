import { Either } from "./Either";
import { Struct } from "./generic/Struct";
import { Id } from "./Ref";

export type LoggerSettingsAttrs = {
    isEnabled: boolean;
    programId: Id;
    programStageId: Id;
    dataElementFileId: Id;
    usernameAttributeId: Id;
    dataElementDateTimeId: Id;
};

export class LoggerSettings extends Struct<LoggerSettingsAttrs>() {
    static build(data: LoggerSettingsAttrs): Either<Error, LoggerSettings> {
        if (this.isNotValid(data)) {
            return Either.error(new Error("All fields are required"));
        } else if (data.dataElementDateTimeId === data.dataElementFileId) {
            return Either.error(new Error("File and DateTime dataElements cannot be the same"));
        }

        return Either.success(LoggerSettings.create(data));
    }

    static isNotValid(data: LoggerSettingsAttrs): boolean {
        return (
            !data.programId ||
            !data.dataElementFileId ||
            !data.programStageId ||
            !data.usernameAttributeId ||
            !data.dataElementDateTimeId
        );
    }
}
