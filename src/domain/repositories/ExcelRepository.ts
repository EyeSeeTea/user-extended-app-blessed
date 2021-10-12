import { FutureData } from "../entities/Future";
import { FiltersObject } from "../entities/UserList";
import { User } from "../entities/User";

export interface ExcelRepository {
    //not sure what type orgUnitsField would be or the return type?
    exportToCsv(columns: string[], filterOptions: FiltersObject, { orgUnitsField }: any): string;
    exportTemplateToCsv(): string;
    //not sure what type { maxUsers, orgUnitsField } would be or the return type?
    importFromCsv(file: File, { maxUsers, orgUnitsField }: any): User[];
    saveCsv(contents: string, name: string): FutureData<void>;
    exportEmptyTemplate(): string;
}
