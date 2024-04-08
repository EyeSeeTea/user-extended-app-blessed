type StatsAttrs = {
    created: number;
    ignored: number;
    updated: number;
    deleted: number;
    errorMessage: string;
};

export class Stats {
    public readonly created: number;
    public readonly ignored: number;
    public readonly updated: number;
    public readonly deleted: number;
    public readonly errorMessage: string;

    constructor(attrs: StatsAttrs) {
        this.created = attrs.created;
        this.ignored = attrs.ignored;
        this.updated = attrs.updated;
        this.deleted = attrs.deleted;
        this.errorMessage = attrs.errorMessage;
    }

    static combine(stats: Stats[]): Stats {
        return stats.reduce((acum, stat) => {
            return {
                errorMessage: `${acum.errorMessage}${stat.errorMessage}`,
                created: acum.created + stat.created,
                ignored: acum.ignored + stat.ignored,
                updated: acum.updated + stat.updated,
                deleted: acum.deleted + stat.deleted,
            };
        }, Stats.empty());
    }

    static empty(): Stats {
        return { deleted: 0, errorMessage: "", created: 0, ignored: 0, updated: 0 };
    }
}
