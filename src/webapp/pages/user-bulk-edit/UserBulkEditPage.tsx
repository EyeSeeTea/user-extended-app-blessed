import { Button, ButtonStrip, CenteredContent, NoticeBox } from "@dhis2/ui";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";

//import { useLoading } from "@eyeseetea/d2-ui-components";
import { Paper } from "@material-ui/core";
import { Delete, ViewColumn } from "@material-ui/icons";
import _ from "lodash";
import { IconButton } from "material-ui";
import React, { useCallback, useState } from "react";
import { Form, useForm } from "react-final-form";
import { Redirect, useLocation } from "react-router";
import AutoSizer from "react-virtualized-auto-sizer";
import { VariableSizeGrid as Grid } from "react-window";
import styled from "styled-components";
//import { MetadataResponse } from "../../../domain/entities/Metadata"; //will I use the clean architecture? 
import {  User } from "../../../domain/entities/User";

import i18n from "../../../locales";
import { ColumnSelectorDialog } from "../../components/column-selector-dialog/ColumnSelectorDialog";
import { ImportSummary } from "../../components/import-summary/ImportSummary";
import { PageHeader } from "../../components/page-header/PageHeader";
import { RenderPredictorImportField } from "../../components/user-form/UserForm";
import { predictorFormFields, getPredictorFieldName } from "../../components/user-form/utils";
import { useAppContext } from "../../contexts/app-context";
import { useGoBack } from "../../hooks/useGoBack";

const rowHeight = (index: number) => (index === 0 ? 30 : 70);
const columnWidth = (index: number) => (index === 0 ? 50 : 250);

/*export interface PredictorBulkEditPageProps {
    type: ActionType;
}*/

export interface PredictorBulkEditPageProps {
    users: User[];
}

export type ActionType = "import" | "bulk-edit";
//: React.FC<PredictorBulkEditPageProps> { users }
export const UserBulkEditPage = () => {
    const { compositionRoot } = useAppContext();
    const goBack = useGoBack();
    //const loading = useLoading();

    const location = useLocation<{ users: User[] }>();
    const [usersToEdit] = React.useState<User[]>(location.state.users ?? []);
    const [summary, setSummary] = useState<any[]>(); //MetadataResponse
    const [columns, setColumns] = useState<string[]>(basePredictorColumns);
    const [columnSelectorOpen, setColumnSelectorOpen] = useState<boolean>(false);

    const goHome = useCallback(() => goBack(true), [goBack]);

    const onSubmit = useCallback(
        async ({ usersToEdit }: { usersToEdit: User[] }) => {
            //loading.show(true, i18n.t("Saving predictors"));
            console.log("here!!");
            //const { data = [], error } = await compositionRoot.users.save(users).runAsync();
            //if (error) return error ?? i18n.t("Network error");
            //loading.reset();

            /*if (_.some(data, foo => foo.status === "ERROR")) {
                setSummary(data);
            } else {
                goHome();
            }*/
            //, loading
        },
        [compositionRoot, goHome]
    );
    return (
        <Form<{ usersToEdit: User[] }>
            autocomplete="off"
            onSubmit={onSubmit}
            initialValues={{ usersToEdit }}
            render={({ handleSubmit, values, submitError }) => (
                <StyledForm onSubmit={handleSubmit}>
                    <MaxHeight>
                        <AutoSizer>
                            {({ height, width }: {height: number, width: number}) => (
                                <Grid
                                    height={height}
                                    width={width}
                                    rowCount={values.usersToEdit.length + 1}
                                    columnCount={columns.length + 1}
                                    estimatedColumnWidth={250}
                                    estimatedRowHeight={70}
                                    rowHeight={rowHeight}
                                    columnWidth={columnWidth}
                                    itemData={{ columns }}
                                >
                                    {Row}
                                </Grid>
                            )}
                        </AutoSizer>
                    </MaxHeight>

                    {submitError && (
                        <NoticeBox title={i18n.t("Error saving users")} error={true}>
                            {submitError}
                        </NoticeBox>
                    )}

                    <ButtonsRow middle>
                        <Button type="submit" primary>
                            {i18n.t("Save")}
                        </Button>

                        <Button type="reset" onClick={goHome}>
                            {i18n.t("Close")}
                        </Button>
                    </ButtonsRow>
                </StyledForm>
            )}
        />
    );
};
/*
    <ConfirmationDialog
                title={i18n.t("Edit users")}
                open={true}
                onCancel={() => console.log("cancel")}
                onSave={() => console.log("save")}
                maxWidth={"lg"}
                fullWidth={true}
            >
                <Form<{ usersToEdit: User[] }>
                    autocomplete="off"
                    onSubmit={onSubmit}
                    initialValues={{ usersToEdit }}
                    render={({ handleSubmit, values, submitError }) => (
                        <StyledForm onSubmit={handleSubmit}>
                            <MaxHeight>
                                <AutoSizer>
                                    {({ height, width }: {height: number, width: number}) => (
                                        <Grid
                                            height={height}
                                            width={width}
                                            rowCount={values.usersToEdit.length + 1}
                                            columnCount={columns.length + 1}
                                            estimatedColumnWidth={250}
                                            estimatedRowHeight={70}
                                            rowHeight={rowHeight}
                                            columnWidth={columnWidth}
                                            itemData={{ columns }}
                                        >
                                            {Row}
                                        </Grid>
                                    )}
                                </AutoSizer>
                            </MaxHeight>

                            {submitError && (
                                <NoticeBox title={i18n.t("Error saving users")} error={true}>
                                    {submitError}
                                </NoticeBox>
                            )}

                            <ButtonsRow middle>
                                <Button type="submit" primary>
                                    {i18n.t("Save")}
                                </Button>

                                <Button type="reset" onClick={goHome}>
                                    {i18n.t("Close")}
                                </Button>
                            </ButtonsRow>
                        </StyledForm>
                    )}
                />


            </ConfirmationDialog>
*/
const basePredictorColumns = [
    "id",
    "name",
    "email",
    "userCredentials.userRoles",
    "userCredentials.userGroups",
];

const MaxHeight = styled.div`
    height: 95%;
`;

const ButtonsRow = styled(ButtonStrip)`
    padding: 20px;

    button:focus::after {
        border-color: transparent !important;
    }
`;

const Row: React.FC<RowItemProps & { style: object }> = ({ style, ...props }) => (
    <div style={style}>
        <RowItem {...props} />
    </div>
);

interface RowItemProps {
    data: { columns: string[] };
    columnIndex: number;
    rowIndex: number;
}

const RowItem: React.FC<RowItemProps> = ({ data, columnIndex, rowIndex }) => {
    const form = useForm<{ users: User[] }>();

    const headerRow = rowIndex === 0;
    const deleteRow = columnIndex === 0;
    const row = rowIndex - 1;
    const field = data.columns[columnIndex - 1];

    const removeRow = useCallback(() => {
        const original = form.getState().values.users;
        const users = [...original.slice(0, row), ...original.slice(row + 1)];
        form.change("users", users);
    }, [form, row]);

    if (deleteRow) {
        return headerRow ? null : (
            <CenteredContent>
                <IconButton tooltip={i18n.t("Delete")} tooltipPosition="top-center" onClick={removeRow}>
                    <Delete />
                </IconButton>
            </CenteredContent>
        );
    }

    if (!field) return null;

    if (headerRow) {
        return (
            <CenteredContent>
                <Title>{getPredictorFieldName(field)}</Title>
            </CenteredContent>
        );
    }

    return (
        <Item>
            <RenderPredictorImportField row={row} field={field} />
        </Item>
    );
};

const Wrapper = styled.div`
    margin: 20px;
`;

const StyledForm = styled.form`
    height: 71vh;
`;

const Container = styled(Paper)`
    margin: 20px;
    padding: 40px;
`;

const Item = styled.div`
    margin: 4px 0;
    padding: 10px;
`;

const Title = styled.b``;
