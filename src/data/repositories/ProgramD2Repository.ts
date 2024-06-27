import _ from "lodash";
import { D2Api } from "./../../types/d2-api";
import { FutureData } from "../../domain/entities/Future";
import { DataElementAttrs, Program, ProgramStageAttrs } from "../../domain/entities/Program";
import { ProgramRepository } from "../../domain/repositories/ProgramRepository";
import { apiToFuture } from "../../utils/futures";
import { Maybe } from "../../types/utils";

export class ProgramD2Repository implements ProgramRepository {
    constructor(private api: D2Api) {}

    get(): FutureData<Program[]> {
        return apiToFuture(
            this.api.models.programs.get({
                fields: {
                    id: true,
                    displayName: true,
                    programTrackedEntityAttributes: { id: true, displayName: true, valueType: true },
                    programStages: {
                        id: true,
                        displayName: true,
                        programStageDataElements: {
                            id: true,
                            dataElement: { id: true, displayName: true, valueType: true },
                        },
                    },
                },
                filter: { programType: { eq: "WITH_REGISTRATION" } },
                paging: false,
            })
        ).map(result => {
            const programs = _(result.objects)
                .map((program): Maybe<Program> => {
                    const programStages = _(program.programStages)
                        .map((programStage): Maybe<ProgramStageAttrs> => {
                            const allDataElements = _(programStage.programStageDataElements)
                                .map(
                                    (psDe): Maybe<DataElementAttrs> =>
                                        psDe.dataElement.valueType === "FILE_RESOURCE"
                                            ? { id: psDe.dataElement.id, name: psDe.dataElement.displayName }
                                            : undefined
                                )
                                .compact()
                                .value();

                            if (allDataElements.length === 0) return undefined;

                            return {
                                id: programStage.id,
                                name: programStage.displayName,
                                dataElements: allDataElements,
                            };
                        })
                        .compact()
                        .value();

                    return Program.create({
                        attributes: _(program.programTrackedEntityAttributes)
                            .map(attribute => {
                                if (attribute.valueType !== "TEXT" && attribute.valueType !== "LONG_TEXT")
                                    return undefined;
                                return { id: attribute.id, name: attribute.displayName };
                            })
                            .compact()
                            .value(),
                        id: program.id,
                        name: program.displayName,
                        programStages: programStages,
                    });
                })
                .compact()
                .value();
            return programs;
        });
    }
}
