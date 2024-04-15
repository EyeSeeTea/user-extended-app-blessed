import _ from "lodash";
import { Instance } from "../data/entities/Instance";
import { D2Api } from "../types/d2-api";

export function getMajorVersion(version: string): number {
    const apiVersion = _.get(version.split("."), 1);
    if (!apiVersion) throw new Error(`Invalid version: ${version}`);
    return Number(apiVersion);
}

export function getD2APiFromInstance(instance: Instance) {
    return new D2Api({ baseUrl: instance.url, auth: instance.auth, backend: "fetch" });
}

export const orgUnitListParams = {
    fields: {
        id: true,
        level: true,
        displayName: true,
        path: true,
        children: true,
        shortName: true,
    },
};

export const orgUnitControls = {
    filterByLevel: true,
    filterByGroup: true,
    filterByProgram: false,
    selectAll: false,
};
