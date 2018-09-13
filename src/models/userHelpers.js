import _ from 'lodash';
import moment from 'moment';
import Papa from 'papaparse';

const queryFields = [
    'displayName|rename(name)',
    'shortName',
    'id',
    'userCredentials[username, userRoles[id,displayName]]',
    'lastUpdated',
    'created',
    'displayDescription',
    'code',
    'publicAccess',
    'access',
    'href',
    'level',
    'userGroups[id,displayName,publicAccess]',
    'organisationUnits[id,displayName]',
    'dataViewOrganisationUnits[id,displayName]',
].join(",");

/*
    Limit Uids to avoid 413 Request too large
    maxUids = (maxSize - urlAndOtherParamsSize) / (uidSize + encodedCommaSize)
*/
const maxUids = (8192 - 1000) / (11 + 3);

const ColumnNameFromPropertyMapping = {
    id: "ID",
    name: "Name",
    username: "Username",
    userRoles: "Roles",
    lastUpdated: "Updated",
    created: "Created",
    userGroups: "Groups",
    organisationUnits: "OUOutput",
    dataViewOrganisationUnits: "OUCapture",
};

function buildD2Filter(filters) {
    return filters
        .map(([key, [operator, value]]) =>
            [key, operator, _.isArray(value) ? `[${_(value).take(maxUids).join(",")}]` : value].join(":"));
}

function getColumnNameFromProperty(property) {
    return ColumnNameFromPropertyMapping[property] || property;
}

function date(stringDate) {
    return moment(stringDate).format("YYYY-MM-DD HH:mm:ss");
}

function namesFromCollection(collection) {
    return (collection.toArray ? collection.toArray() : collection)
        .map(m => m.displayName)
        .join(", ");
}

function getPlainUser(user) {
    const userCredentials = user.userCredentials || {};

    return {
        id: user.id,
        name: user.name,
        username: userCredentials.username,
        lastUpdated: date(user.lastUpdated),
        created: date(user.created),
        userRoles: namesFromCollection(userCredentials.userRoles),
        userGroups: namesFromCollection(user.userGroups),
        organisationUnits: namesFromCollection(user.organisationUnits),
        dataViewOrganisationUnits: namesFromCollection(user.dataViewOrganisationUnits),
    };
}

/* Public interface */

/* Return an array of users from DHIS2 API.

    filters: Object with `field` as keys, `[operator, value]` as values.
    listOptions: Object to be passed directory to d2.models.users.list(...)
*/
function getList(d2, filters, listOptions) {
    const model = d2.models.user;
    const activeFilters = _(filters).pickBy().toPairs().value();

    /*  Filtering over nested fields (table[.table].field) in N-to-N relationships (for
        example: userCredentials.userRoles.id), fails in dhis2 < v2.30. So we need to make
        separate calls to the API for those filters and use the returned IDs to build
        the final, paginated call. */

    const [preliminarFilters, normalFilters] =
        _(activeFilters).partition(([key, opValue]) => key.match(/\./)).value();
    const preliminarD2Filters$ = preliminarFilters.map(preliminarFilter =>
        model
            .list({
                paging: false,
                fields: "id",
                filter: buildD2Filter([preliminarFilter]),
            })
            .then(collection => collection.toArray().map(obj => obj.id))
            .then(ids => `id:in:[${_(ids).take(maxUids).join(",")}]`)
    );

    return Promise.all(preliminarD2Filters$).then(preliminarD2Filters => {
        const filters = buildD2Filter(normalFilters).concat(preliminarD2Filters);

        return model.list({
            paging: true,
            fields: queryFields,
            filter: _(filters).isEmpty() ? "name:ne:default" : filters,
            ...listOptions,
        });
    });
}

/* Get users from Dhis2 API and export given columns to a CSV string */
async function exportToCsv(d2, columns, filterOptions) {
    const { filters, ...listOptions } = { ...filterOptions, paging: false };
    const users = await getList(d2, filters, listOptions);
    const userRows = users.toArray().map(user => _.at(getPlainUser(user), columns));
    const header = columns.map(getColumnNameFromProperty);
    const table = [header, ...userRows]

    return Papa.unparse(table);
}

export { getList, exportToCsv };
