import React from 'react';
import PropTypes from 'prop-types';
import IconButton from 'material-ui/IconButton/IconButton';
import Popover from 'material-ui/Popover/Popover';
import Menu from 'material-ui/Menu/Menu';
import MenuItem from 'material-ui/MenuItem/MenuItem';
import ImportExportIcon from 'material-ui/svg-icons/communication/import-export';
import FileSaver from 'file-saver';
import moment from 'moment';
import fileDialog from 'file-dialog';

import { exportToCsv, importFromCsv } from '../models/userHelpers';
import snackActions from '../Snackbar/snack.actions';

class ImportExport extends React.Component {
    static propTypes = {
        d2: PropTypes.object.isRequired,
        columns: PropTypes.arrayOf(PropTypes.string).isRequired,
        filterOptions: PropTypes.object.isRequired,
        onImport: PropTypes.func.isRequired,
    }

    state = { isMenuOpen: false, anchorEl: null }

    popoverConfig = {
        anchorOrigin: { vertical: "bottom", horizontal: "left" },
        targetOrigin: { vertical: "top", horizontal: "left"},
    }

    openMenu = (ev) => {
        this.setState({ isMenuOpen: true, anchorEl: ev.currentTarget });
    }

    closeMenu = () => {
        this.setState({ isMenuOpen: false, anchorEl: null });
    }

    exportToCsvAndSave = async () => {
        const { d2, columns, filterOptions } = this.props;
        const csvString = await exportToCsv(d2, columns, filterOptions);
        const blob = new Blob([csvString], {type: "text/plain;charset=utf-8"});
        const datetime = moment().format("YYYY-MM-DD_hh-mm-ss");
        FileSaver.saveAs(blob, `users-${datetime}.csv`);
        this.closeMenu();
    }

    importFromCsv = () => {
        const { onImport } = this.props;

        fileDialog({ accept: ".csv" })
            .then(files => importFromCsv(d2, files[0]))
            .then(onImport)
            .then(this.closeMenu)
            .catch(err => snackActions.show({ message: err.toString() }));
    }

    render() {
        const { d2 } = this.props;
        const t = d2.i18n.getTranslation.bind(d2.i18n);
        const { isMenuOpen, anchorEl } = this.state;
        const { popoverConfig, closeMenu, importFromCsv, exportToCsvAndSave } = this;

        return (
            <div>
                <IconButton onTouchTap={this.openMenu} tooltipPosition="bottom-left" tooltip={t("import_export")}>
                    <ImportExportIcon />
                </IconButton>

                <Popover
                    open={isMenuOpen}
                    anchorEl={anchorEl}
                    anchorOrigin={popoverConfig.anchorOrigin}
                    targetOrigin={popoverConfig.targetOrigin}
                    onRequestClose={closeMenu}
                >
                    <Menu>
                        <MenuItem primaryText={t("export")} onClick={exportToCsvAndSave} />
                        <MenuItem primaryText={t("import")} onClick={importFromCsv} />
                    </Menu>
                </Popover>
            </div>
        );
    }
}

export default ImportExport;