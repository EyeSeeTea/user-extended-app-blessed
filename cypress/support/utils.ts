import * as _ from "lodash";
import { DataValue } from "./DataValue";

type Name = string;

interface DataValueDef<Name extends string = string> {
    name: Name;
    value: string;
    comment?: string;
}

export function indexDataValues<K extends string>(
    dataValueDefs: DataValueDef[]
): Record<K, { name: K; value: string }> {
    const obj = _.keyBy(dataValueDefs, o => o.name);
    return obj as Record<K, DataValueDef<K>>;
}

export function getExpectedDataValues(options: {
    dataValues: Record<string, { name: string; value: string }>;
    orgUnit: Name;
    period: string | number;
}): DataValue[] {
    const { dataValues, orgUnit, period } = options;

    return _(dataValues)
        .values()
        .map(dv => ({
            dataElement: dv.name,
            period: period.toString(),
            orgUnit,
            value: dv.value,
        }))
        .value();
}
