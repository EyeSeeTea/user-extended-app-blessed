import _ from "lodash";

export function extractIdFromPath(orgUnitPath?: string): string {
    return _(orgUnitPath).split("/").last() ?? "";
}

export function extractIdsFromPaths(orgUnitPaths: string[]): string[] {
    return orgUnitPaths.map(extractIdFromPath);
}
