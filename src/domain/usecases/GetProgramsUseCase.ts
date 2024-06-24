import { FutureData } from "../entities/Future";
import { Program } from "../entities/Program";
import { ProgramRepository } from "../repositories/ProgramRepository";

export class GetProgramsUseCase {
    constructor(private programRepository: ProgramRepository) {}

    execute(): FutureData<Program[]> {
        return this.programRepository.get();
    }
}
