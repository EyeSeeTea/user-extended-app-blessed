import { Instance } from "./data/entities/Instance";
import { InstanceD2ApiRepository } from "./data/repositories/InstanceD2ApiRepository";
import { MetadataD2ApiRepository } from "./data/repositories/MetadataD2ApiRepository";
import { UserD2ApiRepository } from "./data/repositories/UserD2ApiRepository";
import { ExportUsersUseCase } from "./domain/usecases/ExportUsersUseCase";
import { GetColumnsUseCase } from "./domain/usecases/GetColumnsUseCase";
import { GetCurrentUserUseCase } from "./domain/usecases/GetCurrentUserUseCase";
import { GetInstanceLocalesUseCase } from "./domain/usecases/GetInstanceLocalesUseCase";
import { GetInstanceVersionUseCase } from "./domain/usecases/GetInstanceVersionUseCase";
import { GetOrgUnitPathsUseCase } from "./domain/usecases/GetOrgUnitPathsUseCase";
import { GetUsersByIdsUseCase } from "./domain/usecases/GetUsersByIdsUseCase";
import { ListAllUserIdsUseCase } from "./domain/usecases/ListAllUserIdsUseCase";
import { ListMetadataUseCase } from "./domain/usecases/ListMetadataUseCase";
import { ListUsersUseCase } from "./domain/usecases/ListUsersUseCase";
import { ListAllUsersUseCase } from "./domain/usecases/ListAllUsersUseCase";
import { RemoveUsersUseCase } from "./domain/usecases/RemoveUsersUseCase";
import { SaveColumnsUseCase } from "./domain/usecases/SaveColumnsUseCase";
import { SaveUserOrgUnitUseCase } from "./domain/usecases/SaveUserOrgUnitUseCase";
import { SaveUserStatusUseCase } from "./domain/usecases/SaveUserStatusUseCase";
import { SaveUsersUseCase } from "./domain/usecases/SaveUsersUseCase";
import { UpdateUserPropUseCase } from "./domain/usecases/UpdateUserPropUseCase";
import { CopyInUserUseCase } from "./domain/usecases/CopyInUserUseCase";
import { ImportUsersUseCase } from "./domain/usecases/ImportUsersUseCase";

export function getCompositionRoot(instance: Instance) {
    const instanceRepository = new InstanceD2ApiRepository(instance);
    const userRepository = new UserD2ApiRepository(instance);
    const metadataRepository = new MetadataD2ApiRepository(instance);

    return {
        instance: getExecute({
            getVersion: new GetInstanceVersionUseCase(instanceRepository),
            getLocales: new GetInstanceLocalesUseCase(instanceRepository),
        }),
        users: getExecute({
            getCurrent: new GetCurrentUserUseCase(userRepository),
            list: new ListUsersUseCase(userRepository),
            listAll: new ListAllUsersUseCase(userRepository),
            listAllIds: new ListAllUserIdsUseCase(userRepository),
            get: new GetUsersByIdsUseCase(userRepository),
            save: new SaveUsersUseCase(userRepository),
            saveStatus: new SaveUserStatusUseCase(userRepository),
            updateProp: new UpdateUserPropUseCase(userRepository),
            getColumns: new GetColumnsUseCase(userRepository),
            saveColumns: new SaveColumnsUseCase(userRepository),
            remove: new RemoveUsersUseCase(userRepository),
            saveOrgUnits: new SaveUserOrgUnitUseCase(userRepository),
            export: new ExportUsersUseCase(userRepository),
            copyInUser: new CopyInUserUseCase(userRepository),
            import: new ImportUsersUseCase(userRepository),
        }),
        metadata: getExecute({
            list: new ListMetadataUseCase(metadataRepository),
            getOrgUnitPaths: new GetOrgUnitPathsUseCase(metadataRepository),
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
