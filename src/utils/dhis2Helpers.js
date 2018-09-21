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

function getBasicFields(model, fields = ['id', 'displayName', 'path']) {
    return model
        .list({ paging: false, fields: fields.join(",") })
        .then(collection => collection.toArray())
        .then(models => models.map(model => _.pick(model, fields)));
}

async function getModelValuesByField(fields) {
    const modelByField = {
        userRoles: d2.models.userRoles,
        userGroups: d2.models.userGroups,
        organisationUnits: d2.models.organisationUnits,
        dataViewOrganisationUnits: d2.models.organisationUnits,
    };
    const models = _(modelByField).at(fields).compact().uniqBy().value();
    const valuesList = await mapPromise(models, getBasicFields);

    return _(models)
        .zip(valuesList)
        .flatMap(([model, values]) =>
            _(modelByField)
                .toPairs()
                .map(([_field, _model]) => _model === model ? [_field, values] : null)
                .compact()
                .value()
        )
        .fromPairs()
        .value();
}

export { getOrgUnitsRoots, mapPromise, getBasicFields, getModelValuesByField };
