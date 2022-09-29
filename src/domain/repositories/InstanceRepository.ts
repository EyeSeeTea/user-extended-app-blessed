import { FutureData } from "../entities/Future";
import { Locale } from "../entities/Locale";

export interface InstanceRepository {
    getBaseUrl(): string;
    getInstanceVersion(): FutureData<string>;
    getLocales(type: LocaleType): FutureData<Locale[]>;
}

export type LocaleType = "dbLocale" | "uiLocale";
