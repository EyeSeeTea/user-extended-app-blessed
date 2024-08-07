import TextField from "d2-ui/lib/form-fields/TextField";
import FormBuilder from "d2-ui/lib/forms/FormBuilder.component";
import Validators from "d2-ui/lib/forms/Validators";
import _ from "lodash";
import fp from "lodash/fp";
import PropTypes from "prop-types";
import React from "react";
import Dropdown from "./Dropdown.component";
import i18n from "../../locales";
import { Button } from "@material-ui/core";

export default class SettingsDialog extends React.Component {
    static propTypes = {
        onRequestClose: PropTypes.func.isRequired,
        settings: PropTypes.object.isRequired,
    };

    static contextTypes = {
        d2: PropTypes.object.isRequired,
    };

    tabs = {
        importExport: ["organisationUnitsField"],
    };

    constructor(props, context) {
        super(props);

        const { i18n } = context.d2;
        this.getTranslation = i18n.getTranslation.bind(i18n);

        this.state = {
            currentTab: "general",
            formStatuses: {},
            settings: props.settings,
        };
    }

    save = () => {
        const { onRequestClose } = this.props;
        const { settings } = this.state;
        settings.save().then(() => onRequestClose(settings));
    };

    onUpdateField = (key, value) => {
        const { settings } = this.state;
        const newSettings = settings.set({ [key]: value });
        this.setState({ settings: newSettings });
    };

    getFields(key) {
        const { settings } = this.state;
        const keys = _.get(this.tabs, key);
        const tabFields = _(settings.fields).keyBy("name").at(keys).value();

        return tabFields.map(field => {
            const value = settings.get(field.name);

            switch (field.type) {
                case "string":
                    return {
                        name: field.name,
                        value: (value !== null && value !== undefined && value) || field.defaultValue || "",
                        component: TextField,
                        validators: [
                            {
                                validator: Validators.isRequired,
                                message: this.getTranslation(Validators.isRequired.message),
                            },
                        ],
                        props: {
                            type: "string",
                            style: { width: "100%" },
                            changeEvent: "onBlur",
                            floatingLabelText: field.label,
                        },
                    };
                case "select":
                    return {
                        name: field.name,
                        component: Dropdown,
                        value: value,
                        props: {
                            options: field.options,
                            isRequired: true,
                            labelText: field.label,
                            style: { width: "100%" },
                            defaultValue: field.defaultValue,
                        },
                    };
                default:
                    throw new Error(`Unsupported field type: ${field.type}`);
            }
        });
    }

    onChangeTab(value) {
        this.setState({ currentTab: value });
    }

    onUpdateFormStatus = (section, status) => {
        const { formStatuses } = this.state;
        const newFormStatuses = fp.set(section, status.valid, formStatuses);
        this.setState({ formStatuses: newFormStatuses });
    };

    cancel = () => {
        this.props.onRequestClose();
    };

    render() {
        const { settings, formStatuses } = this.state;
        const saveIsEnabled = settings && _(formStatuses).values().every();

        return (
            <div style={{ padding: 10, margin: 10 }}>
                <FormBuilder
                    validateOnRender={false}
                    fields={this.getFields("importExport")}
                    onUpdateFormStatus={status => _.defer(this.onUpdateFormStatus, "importExport", status)}
                    onUpdateField={this.onUpdateField}
                />

                <section style={{ display: "flex", gap: "1em" }}>
                    <Button variant="contained" color="primary" disabled={!saveIsEnabled} onClick={this.save}>
                        {i18n.t("Save")}
                    </Button>
                    <Button onClick={this.cancel}>{i18n.t("Close")}</Button>
                </section>
            </div>
        );
    }
}
