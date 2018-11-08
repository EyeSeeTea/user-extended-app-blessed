import React from 'react';
import PropTypes from 'prop-types';
import IconButton from 'material-ui/IconButton/IconButton';
import Popover from 'material-ui/Popover/Popover';
import Menu from 'material-ui/Menu/Menu';
import MenuItem from 'material-ui/MenuItem/MenuItem';
import ImportExportIcon from 'material-ui/svg-icons/communication/import-export';
import ExportIcon from 'material-ui/svg-icons/navigation/arrow-upward';
import ImportIcon from 'material-ui/svg-icons/navigation/arrow-downward';
import FileSaver from 'file-saver';
import moment from 'moment';
import fileDialog from 'file-dialog';

import { exportToCsv, importFromCsv } from '../models/userHelpers';
import snackActions from '../Snackbar/snack.actions';
import ModalLoadingMask from './ModalLoadingMask.component';

class ImportExport extends React.Component {
    static propTypes = {
        d2: PropTypes.object.isRequired,
        columns: PropTypes.arrayOf(PropTypes.string).isRequired,
        filterOptions: PropTypes.object.isRequired,
        onImport: PropTypes.func.isRequired,
        maxUsers: PropTypes.number.isRequired,
    }

    state = { isMenuOpen: false, anchorEl: null, isProcessing: false };

    t = this.props.d2.i18n.getTranslation.bind(this.props.d2.i18n);

    styles = {
        loadingMask: {
            position: 'fixed',
            top: 0,
            left: 0,
            paddingTop: '200px',
            width: '100%',
            height: '100%',
            zIndex: 1000,
            backgroundColor: '#000000',
            opacity: 0.5,
            textAlign: 'center',
        },
    };

    popoverConfig = {
        anchorOrigin: { vertical: "center", horizontal: "middle" },
        targetOrigin: { vertical: "top", horizontal: "right"},
    }

    openMenu = (ev) => {
        this.setState({ isMenuOpen: true, anchorEl: ev.currentTarget });
    }

    closeMenu = () => {
        this.setState({ isMenuOpen: false });
    }

    exportToCsvAndSave = async () => {
        const { d2, columns, filterOptions } = this.props;
        this.setState({ isProcessing : true });

        try {
            const csvString = await exportToCsv(d2, columns, filterOptions);
            const blob = new Blob([csvString], {type: "text/plain;charset=utf-8"});
            const datetime = moment().format("YYYY-MM-DD_HH-mm-ss");
            const filename = `users-${datetime}.csv`
            FileSaver.saveAs(blob, filename);
            snackActions.show({ message: `${this.t("table_exported")}: ${filename}` });
        } finally {
            this.closeMenu();
            this.setState({ isProcessing : false });
        }
    }

    importFromCsv = () => {
        const { onImport, maxUsers } = this.props;

        fileDialog({ accept: ".csv" })
            .then(files => {
                this.setState({ isProcessing : true });
                return importFromCsv(d2, files[0], { maxUsers });
            })
            .then(result => onImport(result))
            .catch(err => snackActions.show({ message: err.toString() }))
            .finally(() => {
                this.closeMenu();
                this.setState({ isProcessing : false });
            });
    }

    render() {
        const { d2 } = this.props;
        const { isMenuOpen, anchorEl, isProcessing } = this.state;
        const { popoverConfig, closeMenu, importFromCsv, exportToCsvAndSave } = this;
        const { t } = this;

        return (
            <div className="data-table-import-export">
                <IconButton onTouchTap={this.openMenu} tooltipPosition="bottom-left" tooltip={t("import_export")}>
                    <ImportExportIcon />
                </IconButton>

                {isProcessing && <ModalLoadingMask />}

                <Popover
                    open={isMenuOpen}
                    anchorEl={anchorEl}
                    anchorOrigin={popoverConfig.anchorOrigin}
                    targetOrigin={popoverConfig.targetOrigin}
                    onRequestClose={closeMenu}
                >
                    <Menu>
                        <MenuItem leftIcon={<ExportIcon/>} primaryText={t("export")} onClick={exportToCsvAndSave} />
                        <MenuItem leftIcon={<ImportIcon/>} primaryText={t("import")} onClick={importFromCsv} />
                    </Menu>
                </Popover>
            </div>
        );
    }
}

export default ImportExport;