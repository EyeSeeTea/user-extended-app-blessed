import _ from "lodash";
import { mapPromise } from "../utils/dhis2Helpers";

/* Get user lists with support for DHIS2 API bugs and to avoid 414-URI-too-long errors */

const queryFields = [
    "id",
    "email",
    "displayName|rename(name)",
    "shortName",
    "firstName",
    "surname",
    "created",
    "lastUpdated",
    "access",
    "href",
    "userCredentials[username,disabled,userRoles[id,displayName],lastLogin]",
    "userGroups[id,displayName,publicAccess]",
    "organisationUnits[id,code,shortName,displayName]",
    "dataViewOrganisationUnits[id,code,shortName,displayName]",
];

// (maxSize - urlAndOtherParamsSize) / (uidSize + encodedCommaSize)
const maxUids = Math.floor((4096 - 1000) / (11 + 3));

// type FiltersObject = Record<string, [Operator, Value] | null>
// type ListOptions = {canManage?: boolean, query?: string, order?: string, page: number, pageSize: number }

/* Return an array of users from DHIS2 API. */
export async function getUserList(d2, filtersObject, listOptions) {
    // Note these problems/shortcomings when using the /users API endpoint:
    //
    // 1) When passing simultaneously params `query` and `filter`, only the first page is returned.
    //
    // 2) Except for the first page, only one record is returned.
    //
    // 3) After a user update, the pager does not reflect the change for some time (10/20 seconds).
    //
    // 4) As we have to use a GET request, so we can easily hit the 414-URI-too-long errors when filtering.
    //
    // So we need to perform a custom filtering and pagination. Do separate queries for params
    // `query` and `filter`, and manually paginate the intersection of users. Also, split the requests
    // when necessary to avoid a 414 error.

    const query = (listOptions.query || "").trim();
    const filters = getFiltersFromObject(filtersObject);
    const { canManage } = listOptions;
    const hasQuery = query !== "" || canManage !== undefined;
    const hasFilters = !_.isEmpty(filters);

    const usersByQuery = hasQuery ? await getD2Users(d2, { query, canManage, fields: "id" }) : null;
    const usersByFilters = hasFilters ? await getFilteredUsers(d2, filters) : null;
    const allUsers = !hasQuery && !hasFilters ? await getD2Users(d2, { fields: "id" }) : null;

    const groupOfUserIds = [usersByQuery, usersByFilters, allUsers]
        .filter(users => users !== null)
        .map(users => users.map(user => user.id));

    const allIds = _.intersection(...groupOfUserIds);
    const { pager, objects: ids } = paginate(allIds, listOptions);

    const usersLists = await mapPromise(_.chunk(ids, maxUids), idsGroup => {
        return getD2Users(d2, {
            order: listOptions.order,
            fields: queryFields.join(","),
            filters: [{ field: "id", operator: "in", value: idsGroup }],
            paging: false,
        });
    });

    return { pager, users: _.flatten(usersLists) };
}

// Record<string, [Operator, Value] | null> -> Array<{field: string, operator: Operator, Value: value}>
function getFiltersFromObject(filtersObject) {
    return _(filtersObject)
        .pickBy()
        .toPairs()
        .map(([field, [operator, value]]) => ({ field, operator, value }))
        .value();
}

// To be used when DHIS2 fixes all the API bugs */
async function getUserListStandard(d2, filtersObject, listOptions) {
    const collection = await d2.models.user.list({
        ..._.pick(listOptions, ["order", "page", "pageSize", "query"]),
        filter: buildD2Filter(getFiltersFromObject(filtersObject)),
        fields: queryFields,
        paging: true,
    });

    return { pager: collection.pager, users: collection.toArray() };
}

/* Manually paginate a collection of objects */
function paginate(objects, options) {
    const { page = 1, pageSize = 50 } = options;
    const start = (page - 1) * pageSize;
    const pageCount = Math.ceil(objects.length / options.pageSize);
    const paginatedObjects = _.sortBy(objects.slice(start, start + pageSize));

    const pager = {
        page,
        pageSize,
        pageCount,
        total: objects.length,
        hasNextPage: () => page < pageCount,
        hasPreviousPage: () => page > 1,
    };

    return { pager, objects: paginatedObjects };
}

// Check if in:[...] filters size exceed the limit. Assume the values are a collection of UIDs */
function filtersExceedLimit(filters) {
    const inFilters = filters.filter(({ operator }) => operator === "in");
    const totalValues = _.sum(inFilters.map(({ value }) => value.length));
    return totalValues > maxUids;
}

async function getD2Users(d2, options) {
    const { fields, paging = false, query, filters = [], ...otherOptions } = options;

    const listOptions = {
        ...otherOptions,
        fields,
        paging,
        ...(query ? { query } : {}),
        ...(!_.isEmpty(filters) ? { filter: buildD2Filter(filters) } : {}),
    };

    const collection = await d2.models.user.list(listOptions);

    return collection.toArray();
}

async function getFilteredUsers(d2, filters) {
    if (!filtersExceedLimit(filters)) {
        return getD2Users(d2, { filters, fields: "id" });
    } else {
        // We have too many in-filters values, make a one request per active filter and intersect the result.
        const [inFilters, nonInFilters] = _.partition(filters, ({ operator }) => operator === "in");
        const groupsOfUserIds = [];

        for (const inFilter of inFilters) {
            const userIdsForFilter = [];

            // For each filter, we can still have too many UIDs, split the requests and perform a union
            for (const valuesGroup of _.chunk(inFilter.value, maxUids)) {
                const filtersForGroup = [...nonInFilters, { ...inFilter, value: valuesGroup }];
                const usersForGroup = await getD2Users(d2, {
                    filters: filtersForGroup,
                    fields: "id",
                });
                userIdsForFilter.push(usersForGroup.map(u => u.id));
            }
            groupsOfUserIds.push(_.union(...userIdsForFilter));
        }
        const ids = _.intersection(...groupsOfUserIds);
        return ids.map(id => ({ id }));
    }
}

function buildD2Filter(filtersList) {
    return filtersList.map(({ field, operator, value }) => {
        const filterValue = _.isArray(value) ? `[${value.join(",")}]` : value;
        return [field, operator, filterValue].join(":");
    });
}
