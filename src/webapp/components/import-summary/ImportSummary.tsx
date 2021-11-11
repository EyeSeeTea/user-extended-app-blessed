import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    DialogContent,
    makeStyles,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@material-ui/core";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import _ from "lodash";
import { useCallback } from "react";
import ReactJson from "react-json-view";
import { hasReplicateAuthority, User } from "../../../domain/entities/User";

//import { MetadataResponse, MetadataResponseStats } from "../../../domain/entities/Metadata";
import i18n from "../../../locales";

const useStyles = makeStyles(theme => ({
    accordionHeading1: {
        marginLeft: 30,
        fontSize: theme.typography.pxToRem(15),
        flexBasis: "55%",
        flexShrink: 0,
    },
    accordionHeading2: {
        fontSize: theme.typography.pxToRem(15),
        color: theme.palette.text.secondary,
    },
    accordionDetails: {
        padding: "4px 24px 4px",
    },
    accordion: {
        paddingBottom: "10px",
    },
    tooltip: {
        maxWidth: 650,
        fontSize: "0.9em",
    },
}));

export const formatStatusTag = (value: string) => {
    const text = _.startCase(_.toLower(value));
    const color =
        value === "ERROR" || value === "FAILURE" || value === "NETWORK ERROR"
            ? "#e53935"
            : value === "DONE" || value === "SUCCESS" || value === "OK"
            ? "#7cb342"
            : "#3e2723";

    return <b style={{ color }}>{text}</b>;
};
//stats: Array<MetadataResponseStats & { type: string }>
const buildSummaryTable = (stats: Array<any & { type: string }>) => {
    return (
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>{i18n.t("Type")}</TableCell>
                    <TableCell>{i18n.t("Created")}</TableCell>
                    <TableCell>{i18n.t("Updated")}</TableCell>
                    <TableCell>{i18n.t("Deleted")}</TableCell>
                    <TableCell>{i18n.t("Ignored")}</TableCell>
                    <TableCell>{i18n.t("Total")}</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {stats.map(({ type, created, updated, deleted, ignored, total }, i) => (
                    <TableRow key={`row-${i}`}>
                        <TableCell>{type}</TableCell>
                        <TableCell>{created}</TableCell>
                        <TableCell>{updated}</TableCell>
                        <TableCell>{deleted}</TableCell>
                        <TableCell>{ignored}</TableCell>
                        <TableCell>{total || _.sum([created, deleted, ignored, updated])}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

const buildMessageTable = (messages: ErrorMessage[]) => {
    return (
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>{i18n.t("Identifier")}</TableCell>
                    <TableCell>{i18n.t("Message")}</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {messages.map(({ id, message }, i) => (
                    <TableRow key={`row-${i}`}>
                        <TableCell>{id}</TableCell>
                        <TableCell>{message}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

interface ErrorMessage {
    id: string;
    message: string;
}

interface ImportSummaryProps {
    results: any[]; //MetadataResponse
    onClose: () => void;
}

export const ImportSummary = ({ results, onClose }: ImportSummaryProps) => {
    const classes = useStyles();

    const copyToClipboard = useCallback((object: unknown) => {
        navigator.clipboard.writeText(JSON.stringify(object, null, 4));
    }, []);

    return (
        <ConfirmationDialog
            isOpen={true}
            title={i18n.t("Import Results")}
            onCancel={onClose}
            cancelText={i18n.t("Ok")}
            maxWidth={"lg"}
            fullWidth={true}
        >
            <DialogContent>
                {results.map(({ status, typeReports = [] }, idx) => {
                    const stats = typeReports.map(({ stats }: { stats: any }) => ({
                        type: i18n.t("Predictors"),
                        ...stats,
                    }));

                    const errors = _.flatMap(typeReports, ({ objectReports }) =>
                        _.flatMap(objectReports, ({ uid, errorReports }) =>
                            errorReports.map(({ message }: { message: string }) => ({ id: uid, message }))
                        )
                    );

                    return (
                        <Accordion
                            defaultExpanded={results.length === 1}
                            className={classes.accordion}
                            key={`row-${idx}`}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography className={classes.accordionHeading1}>
                                    {i18n.t("Import")}
                                    <br />
                                </Typography>
                                <Typography className={classes.accordionHeading2}>
                                    {`${i18n.t("Status")}: `}
                                    {formatStatusTag(status)}
                                </Typography>
                            </AccordionSummary>

                            <AccordionDetails className={classes.accordionDetails}>
                                <Typography variant="overline">{i18n.t("Summary")}</Typography>
                            </AccordionDetails>

                            {stats && (
                                <AccordionDetails className={classes.accordionDetails}>
                                    {buildSummaryTable(stats)}
                                </AccordionDetails>
                            )}

                            {errors.length > 0 && (
                                <div>
                                    <AccordionDetails className={classes.accordionDetails}>
                                        <Typography variant="overline">{i18n.t("Messages")}</Typography>
                                    </AccordionDetails>
                                    <AccordionDetails className={classes.accordionDetails}>
                                        {buildMessageTable(_.take(errors, 10))}
                                    </AccordionDetails>
                                </div>
                            )}
                        </Accordion>
                    );
                })}

                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography className={classes.accordionHeading1}>{i18n.t("JSON Response")}</Typography>
                    </AccordionSummary>

                    <AccordionDetails>
                        <ReactJson src={results} collapsed={2} enableClipboard={copyToClipboard} />
                    </AccordionDetails>
                </Accordion>
            </DialogContent>
        </ConfirmationDialog>
    );
};
