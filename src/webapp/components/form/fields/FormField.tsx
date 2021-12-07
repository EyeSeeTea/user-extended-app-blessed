import { ComponentProps, ComponentType } from "react";
import { Field, UseFieldConfig } from "react-final-form";

export type FormFieldProps<FieldValue, T extends ComponentType<any>> = UseFieldConfig<FieldValue> &
    Omit<ComponentProps<T>, "input" | "meta"> & {
        name: string;
        component: T;
        value?: FieldValue;
        initialValue?: FieldValue;
        defaultValue?: FieldValue;
    };

export const FormField = <FieldValue, T extends ComponentType<any>>(props: FormFieldProps<FieldValue, T>) => {
    return <Field<FieldValue> {...props} />;
};
