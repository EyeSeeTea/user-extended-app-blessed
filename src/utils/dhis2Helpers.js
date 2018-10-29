import _ from 'lodash';
import _m from '../utils/lodash-mixins';

import appStateStore from '../App/appStateStore';

function getOrgUnitsRoots() {
    return appStateStore
        .map(appState => appState.userOrganisationUnits.toArray())
        .first()
        .toPromise();
}

function mapPromise(items, mapper) {
  const reducer = (promise, item) =>
    promise.then(mappedItems => mapper(item).then(res => mappedItems.concat([res])));
  return items.reduce(reducer, Promise.resolve([]));
}

/* Perform a model.list with a filter=FIELD:in:[VALUE1,VALUE2,...], breaking values to
   avoid hitting the 414 URL too-long error.
*/
async function listWithInFilter(model, inFilterField, inFilterValues, options) {
    const maxUrlLength = (8192 - 1000); // Reserve 1000 chars for the rest of URL
    const lengthOfSeparator = encodeURIComponent(",").length;

    const filterGroups = _m(inFilterValues).chunkWhile(values =>
        _(values).map(val => val.length + lengthOfSeparator).sum() < maxUrlLength
    ).value();

    const listOfModels = await mapPromise(filterGroups, values => {
        return model.list({
            ...options,
            filter: `${inFilterField}:in:[${values.join(',')}]`,
        }).then(collection => collection.toArray());
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
        await mapPromise(queryInfos, async ({ model, queryFields }) =>
            [model, await getObjects(d2.models[model], queryFields)]
        )
    );
}

export { getOrgUnitsRoots, mapPromise, getModelValuesByField, listWithInFilter };
