export type ListOptions = { canManage?: boolean; query?: string; order?: string; page: number; pageSize: number };
//[Operator, Value]
export type FiltersObject = Record<string, string | null>;
