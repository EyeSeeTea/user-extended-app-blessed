import _ from "lodash";

const endpoint = "/userDataStore";

const storeNamespace = "user-extended-app";

const storeKey = "settings";

const throwExc = exc => {
    throw exc;
};

class Settings {
    constructor(d2, values) {
        this.d2 = d2;
        this.api = d2.Api.getApi();
        this.fields = Settings.getFields(d2);
        this.values = Settings.validateValues(values, this.fields);
    }

    static validateValues(values, fields) {
        // Set the default value for a setting with a value not present in the options list.
        return _.mapValues(values, (value, key) => {
            const { options, defaultValue } = fields[key] || {};
            if (!options || !defaultValue) return value;
            return _(options).some(option => option.value === value) ? value : defaultValue;
        });
    }

    static getFields(d2) {
        const t = d2.i18n.getTranslation.bind(d2.i18n);

        const fieldsList = [
            {
                name: "visibleTableColumns",
                type: "list",
                label: t("setting_visible_table_columns"),
                defaultValue: [
                    "firstName",
                    "surname",
                    "username",
                    "lastUpdated",
                    "userRoles",
                    "userGroups",
                    "organisationUnits",
                    "dataViewOrganisationUnits",
                ],
            },
            {
                name: "organisationUnitsField",
                type: "select",
                label: t("setting_organisation_units_field"),
                defaultValue: "shortName",
                options: [
                    { text: t("short_name"), value: "shortName" },
                    { text: t("code"), value: "code" },
                ],
            },
        ];

        return _(fieldsList)
            .keyBy("name")
            .value();
    }

    static build(d2) {
        const api = d2.Api.getApi();
        const defaultSettings = _(this.getFields(d2))
            .values()
            .map(field => [field.name, field.defaultValue])
            .fromPairs()
            .value();

        return api
            .get(`${endpoint}/${storeNamespace}/${storeKey}`)
            .then(values => new Settings(d2, values))
            .catch(res => {
                if (res.httpStatusCode === 404) {
                    return new Settings(d2, defaultSettings).save();
                } else {
                    throw res;
                }
            });
    }

    get(name) {
        const field = this.fields[name] || throwExc(`Unknown setting: ${name}`);
        const value = this.values[name];
        return _.isUndefined(value) ? field.defaultValue : value;
    }

    set(partialUpdate) {
        _(partialUpdate).each((value, name) => {
            if (!this.fields[name]) {
                throw `Unknown setting: ${name}=${value}`;
            }
        });
        const newValues = { ...this.values, ...partialUpdate };
        return new Settings(this.d2, newValues);
    }

    async save() {
        const { values, api } = this;
        const namespaces = await api.get(`${endpoint}`);
        const keys = _(namespaces).includes(storeNamespace)
            ? await api.get(`${endpoint}/${storeNamespace}`)
            : [];
        const method = _(keys).includes(storeKey) ? "update" : "post";
        await api[method](`${endpoint}/${storeNamespace}/${storeKey}`, values);

        return this;
    }
}

export default Settings;
