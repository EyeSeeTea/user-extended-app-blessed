import _ from "lodash";
import { Ref } from "../../../domain/entities/Ref";
import { Namespace, NamespaceProperties } from "./Namespaces";

export abstract class StorageClient {
    // Object operations
    public abstract getObject<T extends object>(key: string): Promise<T | undefined>;
    public abstract getOrCreateObject<T extends object>(key: string, defaultValue: T): Promise<T>;
    public abstract saveObject<T extends object>(key: string, value: T): Promise<void>;
    public abstract removeObject(key: string): Promise<void>;

    public async listObjectsInCollection<T extends Ref>(key: string): Promise<T[]> {
        return (await this.getObject<T[]>(key)) ?? [];
    }

    public async getObjectInCollection<T extends Ref>(key: string, id: string): Promise<T | undefined> {
        const rawData = (await this.getObject<T[]>(key)) ?? [];
        const baseElement = _.find(rawData, element => element.id === id);
        if (!baseElement) return undefined;

        const advancedProperties = NamespaceProperties[key] ?? [];
        if (advancedProperties.length > 0) {
            const advancedElement = (await this.getObject(`${key}-${id}`)) ?? {};
            return { ...baseElement, ...advancedElement } as T;
        }

        return baseElement;
    }

    public async saveObjectsInCollection<T extends Ref>(key: Namespace, elements: T[]): Promise<void> {
        const oldData: Ref[] = (await this.getObject(key)) ?? [];
        const cleanData = oldData.filter(item => !elements.some(element => item.id === element.id));

        // Save base elements directly into collection: model
        const advancedProperties = NamespaceProperties[key] ?? [];
        const baseElements = elements.map(element => _.omit(element, advancedProperties));

        await this.saveObject(key, [...cleanData, ...baseElements]);

        // Save advanced properties to its own key: model-id
        if (advancedProperties.length > 0) {
            for (const element of elements) {
                const advancedElement = _.pick(element, advancedProperties);
                await this.saveObject(`${key}-${element.id}`, advancedElement);
            }
        }
    }

    public async saveObjectInCollection<T extends Ref>(key: Namespace, element: T): Promise<void> {
        const advancedProperties = NamespaceProperties[key] ?? [];
        const baseElement = _.omit(element, advancedProperties);

        const oldData: Ref[] = (await this.getObject(key)) ?? [];
        const foundIndex = _.findIndex(oldData, item => item.id === element.id);
        const arrayIndex = foundIndex === -1 ? oldData.length : foundIndex;

        // Save base element directly into collection: model
        await this.saveObject(key, [...oldData.slice(0, arrayIndex), baseElement, ...oldData.slice(arrayIndex + 1)]);

        // Save advanced properties to its own key: model-id
        if (advancedProperties.length > 0) {
            const advancedElement = _.pick(element, advancedProperties);
            await this.saveObject(`${key}-${element.id}`, advancedElement);
        }
    }

    public async removeObjectInCollection(key: string, id: string): Promise<void> {
        const oldData: Ref[] = (await this.getObject(key)) ?? [];
        const newData = _.reject(oldData, { id });
        await this.saveObject(key, newData);

        const advancedProperties = NamespaceProperties[key] ?? [];
        if (advancedProperties.length > 0) {
            await this.removeObject(`${key}-${id}`);
        }
    }

    public async removeObjectsInCollection(key: string, ids: string[]): Promise<void> {
        const oldData: Ref[] = (await this.getObject(key)) ?? [];
        const newData = _.reject(oldData, ({ id }) => ids.includes(id));
        await this.saveObject(key, newData);

        const advancedProperties = NamespaceProperties[key] ?? [];
        if (advancedProperties.length > 0) {
            for (const id of ids) {
                await this.removeObject(`${key}-${id}`);
            }
        }
    }
}
