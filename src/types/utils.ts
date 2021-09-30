import { JSXElementConstructor, ComponentProps } from "react";

export type Maybe<T> = T | undefined | null;

export type Dictionary<T> = Record<string, T>;

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
    {
        [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
    }[Keys];

/* Like Partial<T>, but recursive on object values */
export type RecursivePartial<T> = {
    [P in keyof T]?: T[P] extends (infer U)[]
        ? RecursivePartial<U>[]
        : T[P] extends object
        ? RecursivePartial<T[P]>
        : T[P];
};

/*
Extract properties from an object of a certain type:
    type Person = {name: string, age: number, address: string},
    type StringFields = GetPropertiesByType<Person, string>
    // "name" | "address"
*/
export type GetPropertiesByType<T, FieldType> = {
    [Key in keyof T]: T[Key] extends FieldType ? Key : never;
}[keyof T];

export type RequiredProps<T> = {
    [P in keyof T]-?: NonNullable<T[P]>;
};

export type ComponentParameter<
    ObjectType extends keyof JSX.IntrinsicElements | JSXElementConstructor<any>,
    Prop extends keyof ComponentProps<ObjectType>
> = ComponentProps<ObjectType>[Prop];

export function isValueInUnionType<S, T extends S>(value: S, values: readonly T[]): value is T {
    return (values as readonly S[]).indexOf(value) >= 0;
}

export function fromPairs<Key extends string, Value>(pairs: Array<[Key, Value]>): Record<Key, Value> {
    const empty = {} as Record<Key, Value>;
    return pairs.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), empty);
}

export function getKeys<T>(obj: T): Array<keyof T> {
    return Object.keys(obj) as Array<keyof T>;
}

/* Define only the value type of an object and infer the keys:
    // values :: Record<"key1" | "key2", {value: string}>
    const values = recordOf<{value: string}>()({
        key1: {value: "1"},
        key2: {value: "2"},
    })
*/
export function recordOf<T>() {
    return function <Obj>(obj: { [K in keyof Obj]: T }) {
        return obj;
    };
}
