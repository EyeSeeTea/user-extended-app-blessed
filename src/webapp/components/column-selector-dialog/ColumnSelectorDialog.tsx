import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import { Checkbox, DialogContent } from "@material-ui/core";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import i18n from "../../../locales";

export interface ColumnSelectorDialogProps {
    columns: string[];
    visibleColumns: string[];
    getName: (key: string) => string;
    onChange: (visibleColumns: string[]) => void;
    onCancel: () => void;
}

export function ColumnSelectorDialog(props: ColumnSelectorDialogProps) {
    const { columns, visibleColumns, onChange, onCancel, getName } = props;

    const toggleElement = (name: string) => {
        const newSelection = !visibleColumns.includes(name)
            ? [...visibleColumns, name]
            : visibleColumns.filter(item => item !== name);
        onChange(newSelection);
    };

    return (
        <ConfirmationDialog
            isOpen={true}
            title={i18n.t("Columns to show in table")}
            onCancel={onCancel}
            cancelText={i18n.t("Close")}
            fullWidth
            disableEnforceFocus
        >
            <DialogContent>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell colSpan={12}>{i18n.t("Column")}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {columns.map(name => {
                            const text = getName(name);
                            const checked = visibleColumns.includes(name);
                            const disabled = visibleColumns.length <= 1 && checked;

                            return (
                                <TableRow key={`cell-${name}`}>
                                    <TableCell
                                        component="th"
                                        scope="row"
                                        onClick={() => !disabled && toggleElement(name)}
                                    >
                                        <Checkbox
                                            color={"primary"}
                                            checked={checked}
                                            disabled={disabled}
                                            tabIndex={-1}
                                        />
                                        {text}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </DialogContent>
        </ConfirmationDialog>
    );
}
