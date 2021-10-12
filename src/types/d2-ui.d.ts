declare module "@dhis2/ui" {
    export type InputFieldProps = {
        className?: string;
        dataTest?: string;
        dense?: boolean;
        disabled?: boolean;
        error?: boolean;
        helpText?: string;
        initialFocus?: boolean;
        inputWidth?: string;
        label?: string;
        loading?: boolean;
        max?: string;
        min?: string;
        name?: string;
        placeholder?: string;
        readOnly?: boolean;
        required?: boolean;
        step?: string;
        tabIndex?: string;
        type?:
            | "button"
            | "checkbox"
            | "color"
            | "date"
            | "datetime-local"
            | "email"
            | "file"
            | "hidden"
            | "image"
            | "month"
            | "number"
            | "password"
            | "radio"
            | "range"
            | "reset"
            | "search"
            | "submit"
            | "tel"
            | "text"
            | "time"
            | "url"
            | "week";
        valid?: boolean;
        validationText?: string;
        value?: string;
        warning?: boolean;
        onBlur?: (data: { name?: string; value?: string }, event: FocusEvent) => void;
        onChange?: (data: { name?: string; value?: string }, event: ChangeEvent) => void;
        onFocus?: (data: { name?: string; value?: string }, event: FocusEvent) => void;
    };
    export function HeaderBar(props: { className?: string; appName?: string }): React.ReactElement;
    export function InputField(props: InputFieldProps): React.ReactElement;
}
