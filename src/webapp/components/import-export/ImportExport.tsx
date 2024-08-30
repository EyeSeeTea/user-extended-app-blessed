import React from "react";
import i18n from "../../../locales";
import { IconButton, Menu, MenuItem } from "material-ui";
import { Popover } from "@material-ui/core";
import ImportExportIcon from "@material-ui/icons/ImportExport";
import ImportIcon from "@material-ui/icons/ArrowUpward";
import ExportIcon from "@material-ui/icons/ArrowDownward";
import fileDialog from "file-dialog";
import { importFromCsv, importFromJson } from "../../../legacy/models/userHelpers";
import { useAppContext } from "../../contexts/app-context";
import { useSnackbar, useLoading } from "@eyeseetea/d2-ui-components";
import { ColumnMappingKeys } from "../../../domain/usecases/ExportUsersUseCase";
import { useExportUsers } from "../../hooks/userHooks";
import Settings from "../../../legacy/models/settings";

export const ImportExport: React.FC<ImportExportProps> = props => {
    const { d2 } = useAppContext();
    const { columns, filterOptions, onImport, maxUsers, settings } = props;
    const snackbar = useSnackbar();
    const loading = useLoading();
    const [isMenuOpen, setMenuOpen] = React.useState(false);
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

    const openMenu = (event: React.MouseEvent<HTMLElement>) => {
        setMenuOpen(true);
        setAnchorEl(event.currentTarget);
    };

    const closeMenu = () => {
        setMenuOpen(false);
    };

    const orgUnitsField = settings.get("organisationUnitsField");
    const { exportUsersToCSV, exportUsersToJSON, exportEmptyTemplate } = useExportUsers({
        columns,
        filterOptions,
        orgUnitsField,
        onSuccess: closeMenu,
    });

    const importFromFile = () => {
        fileDialog({ accept: ["text/csv", "application/json"] })
            .then((files: FileList) => {
                loading.show(true);
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
                loading.hide();
            });
    };

    return (
        <div className="data-table-import-export">
            <IconButton onClick={openMenu} tooltipPosition="bottom-left" tooltip={i18n.t("Import/Export")}>
                <ImportExportIcon />
            </IconButton>

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
                    <MenuItem leftIcon={<ExportIcon />} onClick={exportUsersToCSV}>
                        {i18n.t("Export to CSV")}
                    </MenuItem>
                    <MenuItem leftIcon={<ExportIcon />} onClick={exportUsersToJSON}>
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
    settings: Settings;
};
