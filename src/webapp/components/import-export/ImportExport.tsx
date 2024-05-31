import React from "react";
import i18n from "../../../locales";
import { IconButton, Menu, MenuItem } from "material-ui";
import { Popover } from "@material-ui/core";
import ImportExportIcon from "@material-ui/icons/ImportExport";
import ImportIcon from "@material-ui/icons/ArrowUpward";
import ExportIcon from "@material-ui/icons/ArrowDownward";
import FileSaver from "file-saver";
import moment from "moment";
import fileDialog from "file-dialog";
import { exportTemplateToCsv, importFromCsv, importFromJson } from "../../../legacy/models/userHelpers";
import ModalLoadingMask from "../../../legacy/components/ModalLoadingMask.component";
import { useAppContext } from "../../contexts/app-context";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { ColumnMappingKeys } from "../../../domain/usecases/ExportUsersUseCase";

export const ImportExport: React.FC<ImportExportProps> = props => {
    const { compositionRoot, d2 } = useAppContext();
    const { columns, filterOptions, onImport, maxUsers, settings } = props;
    const snackbar = useSnackbar();
    const [isMenuOpen, setMenuOpen] = React.useState(false);
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
    const [isProcessing, setProcessing] = React.useState(false);

    const openMenu = (event: React.MouseEvent<HTMLElement>) => {
        setMenuOpen(true);
        setAnchorEl(event.currentTarget);
    };

    const closeMenu = () => {
        setMenuOpen(false);
    };

    const saveFile = (contents: string, name: string, fileType: string) => {
        const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
        const datetime = moment().format("YYYY-MM-DD_HH-mm-ss");
        const filename = `${name}-${datetime}.${fileType}`;
        FileSaver.saveAs(blob, filename);
        snackbar.success(i18n.t("Table exported: {{filename}}", { filename }));
    };

    const handleExport = async (exportFunc: () => Promise<string>, name: string, fileType: string) => {
        setProcessing(true);
        try {
            const dataString = await exportFunc();
            saveFile(dataString, name, fileType);
        } finally {
            closeMenu();
            setProcessing(false);
        }
    };

    // TODO implement settings use case
    const exportToCsvAndSave = () => {
        const orgUnitsField = settings["organisationUnitsField"];
        handleExport(
            async () =>
                await compositionRoot.users
                    .export({ columns, filterOptions, orgUnitsField, format: "csv" })
                    .toPromise(),
            "users",
            "csv"
        );
    };

    const exportToJsonAndSave = () => {
        const orgUnitsField = settings["organisationUnitsField"];
        handleExport(
            async () =>
                await compositionRoot.users
                    .export({ columns, filterOptions, orgUnitsField, format: "json" })
                    .toPromise(),
            "users",
            "json"
        );
    };

    const exportEmptyTemplate = () => {
        // TODO implement use case for exportUsers
        handleExport(() => exportTemplateToCsv(), "empty-user-template", "csv");
    };

    const importFromFile = () => {
        const orgUnitsField = settings["organisationUnitsField"];
        fileDialog({ accept: ["text/csv", "application/json"] })
            .then((files: FileList) => {
                setProcessing(true);
                const file = files[0];
                if (!file) return;
                if (file.type === "text/csv") {
                    return importFromCsv(d2, file, { maxUsers, orgUnitsField });
                } else if (file.type === "application/json") {
                    return importFromJson(d2, file, { maxUsers, orgUnitsField });
                }
            })
            .then(onImport)
            .catch(err => snackbar.error(err.toString()))
            .finally(() => {
                closeMenu();
                setProcessing(false);
            });
    };

    return (
        <div className="data-table-import-export">
            <IconButton onClick={openMenu} tooltipPosition="bottom-left" tooltip={i18n.t("Import/Export")}>
                <ImportExportIcon />
            </IconButton>

            {isProcessing && <ModalLoadingMask />}

            <Popover
                open={isMenuOpen}
                anchorEl={anchorEl}
                anchorOrigin={{
                    vertical: "center",
                    horizontal: "center",
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                }}
                onClose={closeMenu}
            >
                <Menu>
                    <MenuItem leftIcon={<ImportIcon />} onClick={importFromFile}>
                        {i18n.t("Import")}
                    </MenuItem>
                    <MenuItem leftIcon={<ExportIcon />} onClick={exportToCsvAndSave}>
                        {i18n.t("Export to CSV")}
                    </MenuItem>
                    <MenuItem leftIcon={<ExportIcon />} onClick={exportToJsonAndSave}>
                        {i18n.t("Export to JSON")}
                    </MenuItem>
                    <MenuItem leftIcon={<ExportIcon />} onClick={exportEmptyTemplate}>
                        {i18n.t("Export empty template")}
                    </MenuItem>
                </Menu>
            </Popover>
        </div>
    );
};

export type FilterOption = { search: string; sorting: { field: string; order: "asc" | "desc" } };

export type ImportExportProps = {
    columns: ColumnMappingKeys[];
    filterOptions: FilterOption;
    onImport: (result: any) => void;
    maxUsers: number;
    settings: Record<string, any>;
};
