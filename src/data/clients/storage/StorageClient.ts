import _ from "lodash";
import { Future, FutureData } from "../../../domain/entities/Future";
import { Ref } from "../../../domain/entities/Ref";
import { Namespace, NamespaceProperties } from "./Namespaces";

export abstract class StorageClient {
    // Object operations
    public abstract getObject<T extends object>(key: string): FutureData<T | undefined>;
    public abstract getOrCreateObject<T extends object>(key: string, defaultValue: T): FutureData<T>;
    public abstract saveObject<T extends object>(key: string, value: T): FutureData<void>;
    public abstract removeObject(key: string): FutureData<void>;

    public listObjectsInCollection<T extends Ref>(key: string): FutureData<T[]> {
        return this.getObject<T[]>(key).map(value => value ?? []);
    }

    public getObjectInCollection<T extends Ref>(key: string, id: string): FutureData<T | undefined> {
        return this.getObject<T[]>(key)
            .map(value => value ?? [])
            .flatMap(rawData => {
                const baseElement = _.find(rawData, element => element.id === id);
                if (!baseElement) return Future.success(undefined);
                const advancedProperties = NamespaceProperties[key] ?? [];
                if (advancedProperties.length > 0) {
                    return this.getObject(`${key}-${id}`).map(value => {
                        if (!value) return baseElement;
                        return { ...baseElement, ...value } as T;
                    });
                }
                return Future.success(baseElement);
            });
    }

    public saveObjectsInCollection<T extends Ref>(key: Namespace, elements: T[]): FutureData<void> {
        const advancedProperties = NamespaceProperties[key] ?? [];
        const baseElements = elements.map(element => _.omit(element, advancedProperties));
        return this.getObject<T[]>(key)
            .map(value => <Ref[]>(value ?? []))
            .map(oldData => {
                const cleanData = oldData.filter(item => !elements.some(element => item.id === element.id));
                // Save base elements directly into collection: model
                this.saveObject(key, [...cleanData, ...baseElements]).map(() => {
                    // Save advanced properties to its own key: model-id
                    if (advancedProperties.length > 0) {
                        for (const element of elements) {
                            const advancedElement = _.pick(element, advancedProperties);
                            this.saveObject(`${key}-${element.id}`, advancedElement);
                        }
                    }
                });
            });
    }

    public saveObjectInCollection<T extends Ref>(key: Namespace, element: T): FutureData<void> {
        const advancedProperties = NamespaceProperties[key] ?? [];
        const baseElement = _.omit(element, advancedProperties);
        return this.getObject<T[]>(key)
            .map(value => <Ref[]>(value ?? []))
            .map(oldData => {
                const foundIndex = _.findIndex(oldData, item => item.id === element.id);
                const arrayIndex = foundIndex === -1 ? oldData.length : foundIndex;
                // Save base element directly into collection: model
                this.saveObject(key, [
                    ...oldData.slice(0, arrayIndex),
                    baseElement,
                    ...oldData.slice(arrayIndex + 1),
                ]).map(() => {
                    // Save advanced properties to its own key: model-id
                    if (advancedProperties.length > 0) {
                        const advancedElement = _.pick(element, advancedProperties);
                        this.saveObject(`${key}-${element.id}`, advancedElement);
                    }
                });
            });
    }

    public removeObjectInCollection(key: string, id: string): FutureData<void> {
        return this.getObject(key)
            .map(value => <Ref[]>(value ?? []))
            .map(oldData => {
                const newData = _.reject(oldData, { id });
                this.saveObject(key, newData).map(() => {
                    const advancedProperties = NamespaceProperties[key] ?? [];
                    if (advancedProperties.length > 0) this.removeObject(`${key}-${id}`);
                });
            });
    }

    public removeObjectsInCollection(key: string, ids: string[]): FutureData<void> {
        return this.getObject(key)
            .map(value => <Ref[]>(value ?? []))
            .map(oldData => {
                const newData = _.reject(oldData, ({ id }) => ids.includes(id));
                this.saveObject(key, newData).map(() => {
                    const advancedProperties = NamespaceProperties[key] ?? [];
                    if (advancedProperties.length > 0) for (const id of ids) this.removeObject(`${key}-${id}`);
                });
            });
    }
}
