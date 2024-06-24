import { Either } from "./Either";
import { Struct } from "./generic/Struct";
import { Id } from "./Ref";

export type LoggerSettingsAttrs = {
    isEnabled: boolean;
    programId: Id;
    messageId: Id;
    messageTypeId: Id;
};

export class LoggerSettings extends Struct<LoggerSettingsAttrs>() {
    static build(data: LoggerSettingsAttrs): Either<Error, LoggerSettings> {
        if (!data.programId || !data.messageId || !data.messageTypeId) {
            return Either.error(new Error("Program ID, Message ID, and Message Type ID are required"));
        }

        if (data.messageId === data.messageTypeId) {
            return Either.error(new Error("Message ID and Message Type must be different"));
        }

        return Either.success(LoggerSettings.create(data));
    }
}
