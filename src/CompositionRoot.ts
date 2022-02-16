import { Instance } from "./data/entities/Instance";
import { InstanceD2ApiRepository } from "./data/repositories/InstanceD2ApiRepository";
import { MetadataD2ApiRepository } from "./data/repositories/MetadataD2ApiRepository";
import { UserD2ApiRepository } from "./data/repositories/UserD2ApiRepository";
import { GetColumnsUseCase } from "./domain/usecases/GetColumnsUseCase";
import { GetCurrentUserUseCase } from "./domain/usecases/GetCurrentUserUseCase";
import { GetInstanceVersionUseCase } from "./domain/usecases/GetInstanceVersionUseCase";
import { GetUsersByIdsUseCase } from "./domain/usecases/GetUsersByIdsUseCase";
import { ListAllUserIdsUseCase } from "./domain/usecases/ListAllUserIdsUseCase";
import { ListMetadataUseCase } from "./domain/usecases/ListMetadataUseCase";
import { ListUsersUseCase } from "./domain/usecases/ListUsersUseCase";
import { SaveColumnsUseCase } from "./domain/usecases/SaveColumnsUseCase";
import { SaveUsersUseCase } from "./domain/usecases/SaveUsersUseCase";
import { UpdateUserPropUseCase } from "./domain/usecases/UpdateUserPropUseCase";

export function getCompositionRoot(instance: Instance) {
    const instanceRepository = new InstanceD2ApiRepository(instance);
    const userRepository = new UserD2ApiRepository(instance);
    const metadataRepository = new MetadataD2ApiRepository(instance);

    return {
        instance: getExecute({
            getVersion: new GetInstanceVersionUseCase(instanceRepository),
        }),
        users: getExecute({
            getCurrent: new GetCurrentUserUseCase(userRepository),
            list: new ListUsersUseCase(userRepository),
            listAllIds: new ListAllUserIdsUseCase(userRepository),
            get: new GetUsersByIdsUseCase(userRepository),
            save: new SaveUsersUseCase(userRepository),
            updateProp: new UpdateUserPropUseCase(userRepository),
            getColumns: new GetColumnsUseCase(userRepository),
            saveColumns: new SaveColumnsUseCase(userRepository),
        }),
        metadata: getExecute({
            list: new ListMetadataUseCase(metadataRepository),
        }),
    };
}

export type CompositionRoot = ReturnType<typeof getCompositionRoot>;

function getExecute<UseCases extends Record<Key, UseCase>, Key extends keyof UseCases>(
    useCases: UseCases
): { [K in Key]: UseCases[K]["execute"] } {
    const keys = Object.keys(useCases) as Key[];
    const initialOutput = {} as { [K in Key]: UseCases[K]["execute"] };

    return keys.reduce((output, key) => {
        const useCase = useCases[key];
        const execute = useCase.execute.bind(useCase) as UseCases[typeof key]["execute"];
        output[key] = execute;
        return output;
    }, initialOutput);
}

export interface UseCase {
    execute: Function;
}
