import _ from "lodash";
import { D2Api } from "./../../types/d2-api";
import { FutureData } from "../../domain/entities/Future";
import { Program } from "../../domain/entities/Program";
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
                    programStages: {
                        id: true,
                        programStageDataElements: {
                            id: true,
                            dataElement: { id: true, displayName: true, valueType: true },
                        },
                    },
                },
                filter: { programType: { eq: "WITHOUT_REGISTRATION" } },
                paging: false,
            })
        ).map(result => {
            const programs = _(result.objects)
                .map((program): Maybe<Program> => {
                    const allDataElements = _(program.programStages)
                        .flatMap(ps =>
                            _(ps.programStageDataElements)
                                .map(psDe =>
                                    psDe.dataElement.valueType === "TEXT" || psDe.dataElement.valueType === "LONG_TEXT"
                                        ? psDe.dataElement
                                        : undefined
                                )
                                .compact()
                                .value()
                        )
                        .value();

                    if (allDataElements.length < 2) return undefined;

                    return Program.create({
                        id: program.id,
                        name: program.displayName,
                        dataElements: allDataElements.map(dataElement => ({
                            id: dataElement.id,
                            name: dataElement.displayName,
                        })),
                    });
                })
                .compact()
                .value();
            return programs;
        });
    }
}
