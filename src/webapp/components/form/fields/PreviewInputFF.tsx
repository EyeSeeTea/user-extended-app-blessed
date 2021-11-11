import { InputField } from "@dhis2/ui";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import _ from "lodash";
import React, { useState } from "react";
import { Field, FieldRenderProps } from "react-final-form";

export function PreviewInputFF({ warning, placeholder, children, name, validate }: PreviewInputFFProps) {
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
                    {({ input, meta }) => (
                        <InputField
                            name={input.name}
                            value={buildValue(input.value)}
                            onChange={() => {}}
                            error={!!meta.error}
                            warning={!!warning}
                            validationText={warning ?? meta.error ?? meta.submitError}
                        />
                    )}
                </Field>
            </div>
        </React.Fragment>
    );
}

export interface PreviewInputFFProps extends Pick<FieldRenderProps<string>, "name" | "validate"> {
    placeholder: string;
    warning?: string;
    children: React.ReactNode;
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
