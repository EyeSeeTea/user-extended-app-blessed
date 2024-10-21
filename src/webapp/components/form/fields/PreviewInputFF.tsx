import { InputField } from "@dhis2/ui";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import i18n from "../../../../locales";
import _ from "lodash";
import { TextField } from "@material-ui/core";
import React, { FunctionComponent, useState } from "react";
import { Field, FieldRenderProps } from "react-final-form";

export function PreviewInputFF({
    warning,
    placeholder,
    children,
    name,
    validate,
    component = InputField,
}: PreviewInputFFProps) {
    const [open, setOpen] = useState(false);

    return (
        <React.Fragment>
            <ConfirmationDialog
                title={placeholder}
                isOpen={open}
                maxWidth="xl"
                fullWidth={true}
                onCancel={() => setOpen(false)}
                cancelText={i18n.t("Close")}
            >
                {children}
            </ConfirmationDialog>

            <div onClick={() => setOpen(true)}>
                <Field name={name} validate={validate}>
                    {({ input, meta }) =>
                        component === TextField ? (
                            <TextField
                                name={input.name}
                                value={buildValue(input.value)}
                                onChange={() => {}}
                                error={!!meta.error}
                                helperText={warning ?? meta.error ?? meta.submitError}
                            />
                        ) : (
                            <InputField
                                name={input.name}
                                value={buildValue(input.value)}
                                onChange={() => {}}
                                error={!!meta.error}
                                warning={!!warning}
                                validationText={warning ?? meta.error ?? meta.submitError}
                            />
                        )
                    }
                </Field>
            </div>
        </React.Fragment>
    );
}

export interface PreviewInputFFProps extends Pick<FieldRenderProps<string>, "name" | "validate"> {
    placeholder: string;
    warning?: string;
    children: React.ReactNode;
    component?: FunctionComponent<{
        name: string;
        value: string;
        warning?: boolean;
        error?: boolean;
        validationText?: string;
        onChange: () => void;
    }>;
}

const buildValue = (value: unknown): string => {
    if (Array.isArray(value) && value.length === 0) {
        return "-";
    } else if (Array.isArray(value)) {
        return value.map(item => buildValue(item)).join(", ");
    } else if (_.has(value, "name")) {
        return _.get(value, "name");
    } else if (value) {
        return String(value);
    } else {
        return "-";
    }
};
