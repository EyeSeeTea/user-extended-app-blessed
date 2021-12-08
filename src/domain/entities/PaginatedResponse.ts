export interface PaginatedResponse<T> {
    objects: T[];
    pager: Pager;
}

export interface Pager {
    page: number;
    pageCount: number;
    total: number;
    pageSize: number;
}
