import _ from "lodash";
import { Id } from "./Ref";

export function extractIdFromPath(orgUnitPath?: string): string {
    return _(orgUnitPath).split("/").last() ?? "";
}

export function extractIdsFromPaths(orgUnitPaths: string[]): string[] {
    return orgUnitPaths.map(extractIdFromPath);
}

export function joinPaths(orgUnits: OrgUnit): string {
    return `/${orgUnits.path.join("/")}`;
}

export type OrgUnit = { id: Id; name: string; path: string[] };
