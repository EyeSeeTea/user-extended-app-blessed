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
                res.httpStatusCode === 404 ? new Settings(api).set(defaultSettings).save() : throwExc(res));
    }

    set(partialUpdate) {
        const newValues = { ...this.values, ...partialUpdate };
        return new Settings(this.api, newValues);
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

    getVisibleTableColumns() {
        return this.values.visibleTableColumns;
    }

    setVisibleTableColumns(visibleTableColumns) {
        return this.set({ visibleTableColumns });
    }
}

export default Settings;