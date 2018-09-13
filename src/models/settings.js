import _ from 'lodash';

const endpoint = "/userDataStore";

const storeNamespace = "user-extended-app";

const storeKey = "settings";

const defaultSettings = {
    visibleTableColumns: [
        "firstName",
        "surname",
        "username",
        "lastUpdated",
        "userRoles",
        "userGroups",
        "organisationUnits",
        "dataViewOrganisationUnits",
    ],
};

const throwExc = exc => { throw exc; };

class Settings {
    constructor(api, values = {}) {
        this.api = api;
        this.values = values;
    }

    static build(d2) {
        const api = d2.Api.getApi();

        return api.get(`${endpoint}/${storeNamespace}/${storeKey}`)
            .then(values =>
                new Settings(api, values))
            .catch(res =>
                res.httpStatusCode === 404 ? new Settings(api).save(defaultSettings) : throwExc(res));
    }

    async save(partialUpdate) {
        const { values, api } = this;
        const newValues = { ...values, ...partialUpdate };
        const namespaces = await api.get(`${endpoint}`);
        const keys = _(namespaces).includes(storeNamespace)
            ? await api.get(`${endpoint}/${storeNamespace}`)
            : [];
        const method = _(keys).includes(storeKey) ? "update" : "post";

        await api[method](`${endpoint}/${storeNamespace}/${storeKey}`, newValues);

        return new Settings(api, newValues)
    }

    getVisibleTableColumns() {
        return this.values.visibleTableColumns;
    }

    setVisibleTableColumns(visibleTableColumns) {
        return this.save({ visibleTableColumns });
    }
}

export default Settings;