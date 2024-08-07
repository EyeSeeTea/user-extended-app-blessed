import { FutureData } from "../entities/Future";
import { Program } from "../entities/Program";

export interface ProgramRepository {
    get(): FutureData<Program[]>;
}
