import _ from "lodash";
import { D2Api, D2DataElement } from "./../../types/d2-api";
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
                    programTrackedEntityAttributes: {
                        trackedEntityAttribute: { id: true, displayName: true },
                        valueType: true,
                    },
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
                                .map((psDe): Maybe<DataElementAttrs> => {
                                    const valueType = this.getFileTypeFromDataElement(psDe.dataElement.valueType);
                                    return valueType
                                        ? {
                                              valueType: valueType,
                                              id: psDe.dataElement.id,
                                              name: psDe.dataElement.displayName,
                                          }
                                        : undefined;
                                })
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

                    if (programStages.length === 0) return undefined;

                    return Program.create({
                        attributes: _(program.programTrackedEntityAttributes)
                            .map(attribute => {
                                if (attribute.valueType !== "TEXT" && attribute.valueType !== "LONG_TEXT")
                                    return undefined;
                                return {
                                    id: attribute.trackedEntityAttribute.id,
                                    name: attribute.trackedEntityAttribute.displayName,
                                };
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

    private getFileTypeFromDataElement(valueType: D2DataElement["valueType"]): "FILE" | "DATE" | undefined {
        switch (valueType) {
            case "FILE_RESOURCE":
                return "FILE";
            case "DATE":
                return "DATE";
            case "DATETIME":
                return "DATE";
            default:
                return undefined;
        }
    }
}
