import { InputField, InputFieldProps } from "@dhis2/ui";
import { FieldRenderProps } from "react-final-form";

export const NumberInputFF: React.FC<Pick<FieldRenderProps<string>, "input"> & InputFieldProps> = ({
    input,
    ...props
}) => {
    return (
        <InputField
            {...props}
            name={input.name}
            value={`${input.value}`}
            onChange={({ value }) => input.onChange(parseInt(value ?? "0"))}
            type="number"
        />
    );
};
