import React from 'react';
import PropTypes from 'prop-types';
import IconButton from 'material-ui/IconButton/IconButton';
import Menu from 'material-ui/Menu/Menu';
import ImportExportIcon from 'material-ui/svg-icons/communication/import-export';
import FileSaver from 'file-saver';
import moment from 'moment';
import LoadingMask from '../loading-mask/LoadingMask.component';

import { exportToCsv } from '../models/userHelpers';
import snackActions from '../Snackbar/snack.actions';

class ImportExport extends React.Component {
    static propTypes = {
        d2: PropTypes.object.isRequired,
        columns: PropTypes.arrayOf(PropTypes.string).isRequired,
        filterOptions: PropTypes.object.isRequired,
    };

    state = { isExporting: false };

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

    t = this.props.d2.i18n.getTranslation.bind(this.props.d2.i18n);

    exportToCsvAndSave = async () => {
        const { d2, columns, filterOptions } = this.props;
        this.setState({ isExporting : true });

        try {
            const csvString = await exportToCsv(d2, columns, filterOptions);
            const blob = new Blob([csvString], {type: "text/plain;charset=utf-8"});
            const datetime = moment().format("YYYY-MM-DD_hh-mm-ss");
            const filename = `users-${datetime}.csv`
            FileSaver.saveAs(blob, filename);
            snackActions.show({ message: `${this.t("table_exported")}: ${filename}` });
        } finally {
            this.setState({ isExporting : false });
        }
    }

    render() {
        const { d2 } = this.props;
        const { isExporting } = this.state;
        const { t, exportToCsvAndSave } = this;

        return (
            <div className="data-table-import-export">
                <IconButton
                    disabled={isExporting}
                    onTouchTap={exportToCsvAndSave}
                    tooltipPosition="bottom-left"
                    tooltip={t("export")}
                >
                    <ImportExportIcon />
                </IconButton>

                {isExporting && <LoadingMask style={this.styles.loadingMask} />}
            </div>
        );
    }
}

export default ImportExport;