import _ from "lodash";
import _m from "./lodash-mixins";

import appStateStore from "../App/appStateStore";

function getOrgUnitsRoots() {
    return appStateStore
        .map(appState => appState.userOrganisationUnits.toArray())
        .first()
        .toPromise();
}

async function mapPromise(inputValues, mapper) {
    const output = [];
    for (const value of inputValues) {
        const res = await mapper(value);
        output.push(res);
    }
    return output;
}

/* Perform a model.list with a filter=FIELD:in:[VALUE1,VALUE2,...], breaking values to
   avoid hitting the 414 URL too-long error.
*/
async function listWithInFilter(model, inFilterField, inFilterValues, listOptions, { useInOperator = true } = {}) {
    const maxUrlLength = 8192 - 1000; // Reserve some chars for the rest of URL
    let filterOptions, chunkPredicate;

    if (useInOperator) {
        const getFilter = values => `${inFilterField}:in:[${values.join(",")}]`;
        chunkPredicate = values => encodeURIComponent(getFilter(values)).length < maxUrlLength;
        filterOptions = values => ({ filter: getFilter(values) });
    } else {
        const getFilter = value => `${inFilterField}:eq:${value}`;
        chunkPredicate = values =>
            values.map(value => `filter=${encodeURIComponent(getFilter(value))}`).join("&").length < maxUrlLength;
        filterOptions = values => ({
            filter: values.map(value => `${inFilterField}:eq:${value}`),
            rootJunction: "OR",
        });
    }

    const filterGroups = _m(inFilterValues).chunkWhile(chunkPredicate).value();

    const listOfModels = await mapPromise(filterGroups, values => {
        return model.list({ ...listOptions, ...filterOptions(values) }).then(collection => collection.toArray());
    });

    return _.flatten(listOfModels);
}

function getObjects(model, fields) {
    return model
        .list({ paging: false, fields: fields.join(",") })
        .then(collection => collection.toArray())
        .then(models => models.map(model => _.pick(model, fields)));
}

const queryInfoByField = {
    userRoles: { model: "userRoles", queryFields: ["id", "displayName"] },
    userGroups: { model: "userGroups", queryFields: ["id", "displayName"] },
};

/* Return object {field: [object]}.

    Supported models: userRoles, userGroups
*/
async function getModelValuesByField(d2, fields) {
    const queryInfos = _(queryInfoByField).at(fields).compact().value();

    return _.fromPairs(
        await mapPromise(queryInfos, async ({ model, queryFields }) => [
            model,
            await getObjects(d2.models[model], queryFields),
        ])
    );
}

export { getOrgUnitsRoots, mapPromise, getModelValuesByField, listWithInFilter };
