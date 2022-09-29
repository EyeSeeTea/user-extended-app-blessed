import { Button, ButtonStrip, CenteredContent, NoticeBox } from "@dhis2/ui";
import { MetadataResponse } from "@eyeseetea/d2-api/2.36";
import { useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import { Paper } from "@material-ui/core";
import { Delete, ViewColumn } from "@material-ui/icons";
import { IconButton } from "material-ui";
import React, { useCallback, useState } from "react";
import { Form, useForm } from "react-final-form";
import { Navigate, useLocation } from "react-router";
import AutoSizer from "react-virtualized-auto-sizer";
import { VariableSizeGrid as Grid } from "react-window";
import styled from "styled-components";
import { defaultUser, User } from "../../../domain/entities/User";
import i18n from "../../../locales";
import { generateUid } from "../../../utils/uid";
import { ColumnSelectorDialog } from "../../components/column-selector-dialog/ColumnSelectorDialog";
import { ImportSummary } from "../../components/import-summary/ImportSummary";
import { PageHeader } from "../../components/page-header/PageHeader";
import { RenderUserImportField } from "../../components/user-form/UserForm";
import { getUserFieldName, userFormFields } from "../../components/user-form/utils";
import { useAppContext } from "../../contexts/app-context";
import { useGoBack } from "../../hooks/useGoBack";

const rowHeight = (index: number) => (index === 0 ? 30 : 70);
const columnWidth = (index: number) => (index === 0 ? 50 : 250);

export const UserBulkEditPage: React.FC<{ isEdit: boolean }> = ({ isEdit }) => {
    const { compositionRoot } = useAppContext();
    const goBack = useGoBack();
    const loading = useLoading();
    const snackbar = useSnackbar();

    const location = useLocation();
    const { users: locationUsers = [] } = location.state as { users: User[] };

    const [users, setUsers] = useState<User[]>(locationUsers);
    const [summary, setSummary] = useState<MetadataResponse[]>();
    const [columns, setColumns] = useState<string[]>(baseUserColumns);
    const [columnSelectorOpen, setColumnSelectorOpen] = useState<boolean>(false);

    const goHome = useCallback(() => goBack(true), [goBack]);

    const onSubmit = useCallback(
        async ({ users }: { users: User[] }) => {
            loading.show(true, i18n.t("Saving users"));

            const { data, error } = await compositionRoot.users.save(users).runAsync();
            loading.reset();

            if (error) {
                snackbar.error(error);
                return error;
            }

            if (data && data.status === "ERROR") {
                setSummary([data]);
            } else {
                goHome();
            }
        },
        [compositionRoot, snackbar, goHome, loading]
    );

    const addRow = useCallback(() => {
        const newUser = {
            ...defaultUser,
            id: generateUid(),
            username: "",
            password: `District123$`,
        };

        setUsers(users => users.concat(newUser));
    }, []);

    const title = i18n.t("Edit users");

    if (users.length === 0) return <Navigate replace to="/" />;
    const closeSummary = () => setSummary(undefined);

    return (
        <Wrapper>
            <PageHeader onBackClick={goBack} title={title}>
                <IconButton
                    tooltip={i18n.t("Column settings")}
                    onClick={() => setColumnSelectorOpen(true)}
                    style={{ float: "right" }}
                >
                    <ViewColumn />
                </IconButton>
            </PageHeader>
            {summary ? <ImportSummary results={summary} onClose={closeSummary} /> : null}

            {columnSelectorOpen && (
                <ColumnSelectorDialog
                    columns={userFormFields}
                    visibleColumns={columns}
                    onChange={setColumns}
                    getName={getUserFieldName}
                    onCancel={() => setColumnSelectorOpen(false)}
                />
            )}
            <Container>
                <Form<{ users: User[] }>
                    autocomplete="off"
                    onSubmit={onSubmit}
                    initialValues={{ users }}
                    render={({ handleSubmit, values, submitError }) => (
                        <StyledForm onSubmit={handleSubmit}>
                            <MaxHeight>
                                <AutoSizer>
                                    {({ height, width }: { height: number; width: number }) => (
                                        <Grid
                                            height={height}
                                            width={width}
                                            rowCount={values.users.length + 1}
                                            columnCount={columns.length + 1}
                                            estimatedColumnWidth={250}
                                            estimatedRowHeight={70}
                                            rowHeight={rowHeight}
                                            columnWidth={columnWidth}
                                            itemData={{ columns, isEdit }}
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
                                <Button name={i18n.t("Add user")} onClick={addRow} primary>
                                    {i18n.t("Add user")}
                                </Button>
                            </ButtonsRow>

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
            </Container>
        </Wrapper>
    );
};

const baseUserColumns = ["firstName", "surname", "email", "userRoles", "userGroups", "organisationUnits"];

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
    data: { columns: string[]; isEdit: boolean };
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
                <Title>{getUserFieldName(field)}</Title>
            </CenteredContent>
        );
    }

    return (
        <Item>
            <RenderUserImportField row={row} field={field} isEdit={data.isEdit} />
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
