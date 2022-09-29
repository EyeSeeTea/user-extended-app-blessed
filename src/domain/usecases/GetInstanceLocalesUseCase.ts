import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Locale } from "../entities/Locale";
import { InstanceRepository, LocaleType } from "../repositories/InstanceRepository";

export class GetInstanceLocalesUseCase implements UseCase {
    constructor(private instanceRepository: InstanceRepository) {}

    public execute(type: LocaleType): FutureData<Locale[]> {
        return this.instanceRepository.getLocales(type);
    }
}
