import _ from 'lodash';

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

function getObjects(model, fields) {
    return model
        .list({ paging: false, fields: fields.join(",") })
        .then(collection => collection.toArray())
        .then(models => models.map(model => _.pick(model, fields)));
}

const queryInfoByField = {
    userRoles: { model: "userRoles", queryFields: ["id", "displayName"] },
    userGroups: { model: "userGroups", queryFields: ["id", "displayName"] },
    organisationUnits: { model: "organisationUnits", queryFields: ["id", "path", "displayName"] },
    dataViewOrganisationUnits: { model: "organisationUnits", queryFields: ["id", "path", "displayName"] },
};
        
/* Return object {Field: [Object]}.

    Supported models: userRoles, userGroups, organisationUnits,  dataViewOrganisationUnits.
*/
async function getModelValuesByField(d2, fields) {
    const queryInfoUniqueModels = _(queryInfoByField).at(fields).compact().uniqBy("model").value();
    const objectsByModel = _.fromPairs(
        await mapPromise(queryInfoUniqueModels, async ({ model, queryFields }) =>
            [model, await getObjects(d2.models[model], queryFields)]
        )
    );

    return _(fields)
        .intersection(_.keys(queryInfoByField))
        .map(field => [field, objectsByModel[queryInfoByField[field].model]])
        .fromPairs()
        .value();
}

export { getOrgUnitsRoots, mapPromise, getModelValuesByField };
