import { MetadataResponse } from "@eyeseetea/d2-api/api";
import _ from "lodash";
import { Future, FutureData } from "../domain/entities/Future";
import { Id } from "../domain/entities/Ref";
import { ApiUser } from "./repositories/UserD2ApiRepository";

export function chunkRequest<Res>(
    ids: Id[],
    mapper: (idsGroup: Id[]) => FutureData<Res[]>,
    chunkSize = 100
): FutureData<Res[]> {
    return Future.flatten(
        _.chunk(ids, chunkSize).map(idsC => {
            return mapper(idsC);
        })
    );
}

export function getErrorFromResponse(typeReports: MetadataResponse["typeReports"]): string {
    return _(typeReports)
        .flatMap(typeReport => typeReport.objectReports || [])
        .flatMap(objectReport => objectReport.errorReports || [])
        .flatMap(errorReport => errorReport.message)
        .compact()
        .uniq()
        .join("\n");
}

export function buildUserWithoutPassword(users: ApiUser[]) {
    return _(users)
        .map(user => {
            return { ...user, userCredentials: { ...user.userCredentials, password: "****" }, password: "****" };
        })
        .value();
}
