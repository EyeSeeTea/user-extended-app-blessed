import { FieldState, NoticeBox, Transfer, TransferProps } from "@dhis2/ui";
import React, { useCallback } from "react";
import styled from "styled-components";
import { NamedRef } from "../../../../domain/entities/Ref";

export type TransferFFProps = Omit<TransferProps, "loading" | "onChange" | "selected"> & {
    input: any;
    meta: FieldState<NamedRef[]>;
    error?: boolean;
    loading?: boolean;
    showLoadingStatus?: boolean;
    showValidStatus?: boolean;
    valid?: boolean;
    validationText?: string;
};

export const TransferFF = ({
    input,
    meta,
    validationText,
    loading,
    showLoadingStatus,
    options,
    ...rest
}: TransferFFProps) => {
    const isLoading = loading || (showLoadingStatus && meta.validating);
    const message = validationText ?? meta.error ?? meta.submitError;
    const selected = Array.isArray(input.value) ? input.value.map(({ id }: NamedRef) => id) : [];

    const onChange = useCallback(
        ({ selected }: { selected: string[] }) => {
            input.onChange(selected.map(id => ({ id, name: options.find(item => item.value === id)?.label ?? "" })));
        },
        [input, options]
    );

    return (
        <React.Fragment>
            <StyledTransfer {...rest} options={options} loading={isLoading} onChange={onChange} selected={selected} />

            {!!message && <WarningBox warning={true} title={message} />}
        </React.Fragment>
    );
};

const WarningBox = styled(NoticeBox)`
    margin-top: 20px;
    align-items: center;

    h6 {
        margin: 0px;
    }
`;

const StyledTransfer = styled(Transfer)`
    div {
        border-color: rgb(160, 173, 186);
    }

    .status-icon {
        margin-left: 0;
    }
`;
