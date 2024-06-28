import _ from "lodash";
import { Future, FutureData } from "../domain/entities/Future";
import { LoggerSettings } from "../domain/entities/LoggerSettings";
import { D2Api } from "../types/d2-api";
import { Id } from "../domain/entities/Ref";
import { apiToFuture } from "../utils/futures";
import { TeiGetRequest } from "@eyeseetea/d2-api/api/trackedEntityInstances";
import { getUid } from "../utils/uid";

export class D2ApiTracker {
    constructor(private api: D2Api) {}

    getOrCreate(options: GetTrackerOptions): FutureData<D2TeiResponse> {
        const { data, settings } = options;
        return apiToFuture(
            this.api.trackedEntityInstances.get({
                fields: "trackedEntityType,trackedEntityInstance,attributes,enrollments",
                filter: `${settings.usernameAttributeId}:eq:${data.username}`,
                program: settings.programId,
                ou: [data.orgUnitId],
            } as TeiRequestWithFilter)
        ).flatMap(response => {
            const tei = _(response.trackedEntityInstances).first();
            const enrollment = _(tei?.enrollments).first();
            if (!enrollment || !tei) return this.save(options);
            return Future.success({
                trackedEntityId: tei.trackedEntityInstance,
                enrollmentId: enrollment.enrollment,
                programStageId: settings.programStageId,
            });
        });
    }

    save(options: SaveTrackerType): FutureData<D2TeiResponse> {
        const { data, settings } = options;
        const orgUnitId = data.orgUnitId;
        const currentDateISO = new Date().toISOString();
        const teiId = getUid(`${data.username}_${data.orgUnitId}_tei_${new Date().getTime()}`);
        const enrollmentId = getUid(`${data.username}_${data.orgUnitId}_enrollment_${new Date().getTime()}`);
        return this.getTrackedEntityTypeByProgramId(settings.programId).flatMap(trackedEntityTypeId => {
            return apiToFuture(
                this.api.trackedEntityInstances.post(
                    {},
                    {
                        trackedEntityInstances: [
                            {
                                orgUnit: orgUnitId,
                                trackedEntityType: trackedEntityTypeId,
                                trackedEntityInstance: teiId,
                                attributes: [{ attribute: settings.usernameAttributeId, value: data.username }],
                                enrollments: [
                                    {
                                        enrollment: enrollmentId,
                                        orgUnit: orgUnitId,
                                        program: settings.programId,
                                        enrollmentDate: currentDateISO,
                                        incidentDate: currentDateISO,
                                    },
                                ],
                            },
                        ],
                    }
                )
            ).map(() => {
                return { trackedEntityId: teiId, enrollmentId, programStageId: settings.programStageId };
            });
        });
    }

    private getTrackedEntityTypeByProgramId(programId: Id): FutureData<Id> {
        return apiToFuture(
            this.api.models.programs.get({
                fields: {
                    trackedEntityType: { id: true },
                },
                filter: {
                    id: { eq: programId },
                },
            })
        ).map(response => {
            const firstProgram = _(response.objects).first();
            return firstProgram?.trackedEntityType?.id || "";
        });
    }
}

type TeiRequestWithFilter = TeiGetRequest & { filter: string };
type GetTrackerOptions = { data: D2TeiRecord; settings: LoggerSettings };
type SaveTrackerType = { data: D2TeiRecord; settings: LoggerSettings };
type D2TeiRecord = { username: string; orgUnitId: Id };
export type D2TeiResponse = { trackedEntityId: Id; enrollmentId: Id; programStageId: Id };
