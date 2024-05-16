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
    "userCredentials[username,disabled,userRoles[id,displayName],lastLogin,openId]",
    "userGroups[id,displayName,publicAccess]",
    "organisationUnits[id,code,shortName,displayName]",
    "dataViewOrganisationUnits[id,code,shortName,displayName]",
    "teiSearchOrganisationUnits[id,code,shortName,displayName]",
    "phoneNumber",
];

// (maxSize - urlAndOtherParamsSize) / (uidSize + encodedCommaSize)
const maxUids = Math.floor((4096 - 200) / (11 + 3));

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
    // `query` and `filter`, and manually sort and paginate the intersection of users.
    // Also, split the requests whenever necessary to avoid 414 errors.

    const { canManage } = listOptions;
    const query = (listOptions.query || "").trim();
    const filters = getFiltersFromObject(filtersObject);
    const hasQuery = query !== "" || canManage !== undefined;
    const hasFilters = !_.isEmpty(filters);

    const usersByQuery = hasQuery ? await getD2Users(d2, { query, canManage }) : null;
    const usersByFilters = hasFilters ? await getFilteredUsers(d2, filters) : null;
    const allUsers = !hasQuery && !hasFilters ? await getD2Users(d2, {}) : null;

    const groupOfUserIds = [usersByQuery, usersByFilters, allUsers]
        .filter(users => users !== null)
        .map(users => users.map(user => user.id));

    const allIds = _.intersection(...groupOfUserIds);
    const sortedUsers = await getSortedUsers(d2, allIds, listOptions.order);
    const { pager, objects: pageObjects } = paginate(sortedUsers, listOptions);

    const users = await request(pageObjects, usersGroup => {
        return getD2Users(d2, {
            fields: queryFields,
            filters: [{ field: "id", operator: "in", value: usersGroup.map(u => u.id) }],
            paging: false,
        });
    });

    return { pager, users: sortObjectsByReference(pageObjects, users, "id") };
}

async function request(objects, getRequest) {
    const objectsList = await mapPromise(getChunks(objects), objectsGroup => {
        return getRequest(objectsGroup);
    });

    return _.flatten(objectsList);
}

function getChunks(objs) {
    return _(objs)
        .chunk(maxUids)
        .take(50) // Limit the total chunks
        .value();
}

function sortObjectsByReference(referenceObjects, unsortedObjects, idField) {
    const ids = referenceObjects.map(obj => obj[idField]);

    return _(unsortedObjects)
        .keyBy(obj => obj[idField])
        .at(...ids)
        .compact()
        .value();
}

async function getSortedUsers(d2, userIds, order) {
    if (order) {
        const [orderField = "name", d2Direction = "asc"] = order.split(":");
        const direction = d2Direction.toLowerCase().includes("desc") ? "desc" : "asc";

        const users = await request(userIds, userIdsGroup => {
            return getD2Users(d2, {
                fields: ["id", orderField],
                filters: [{ field: "id", operator: "in", value: userIdsGroup }],
            });
        });

        return _.orderBy(users, [u => (u[orderField] || "").toString().toLowerCase()], [direction]);
    } else {
        return userIds.map(id => ({ id }));
    }
}

// Record<string, [Operator, Value] | null> -> Array<{field: string, operator: Operator, Value: value}>
function getFiltersFromObject(filtersObject) {
    return _(filtersObject)
        .pickBy()
        .toPairs()
        .map(([field, [operator, value]]) => ({ field, operator, value }))
        .value();
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
    const { fields = ["id"], paging = false, query, filters = [], ...otherOptions } = options;

    const listOptions = {
        ...otherOptions,
        fields: fields.join(","),
        paging,
        ...(query ? { query } : {}),
        ...(!_.isEmpty(filters) ? { filter: buildD2Filter(filters) } : {}),
    };

    const collection = await d2.models.user.list(listOptions);

    return collection.toArray();
}

async function getFilteredUsers(d2, filters) {
    if (!filtersExceedLimit(filters)) {
        return getD2Users(d2, { filters });
    } else {
        // We have too many in-filters values, make a one request per active filter and intersect the result.
        const [inFilters, nonInFilters] = _.partition(filters, ({ operator }) => operator === "in");
        const groupsOfUserIds = [];

        for (const inFilter of inFilters) {
            const userIdsForFilter = [];

            // For each filter, we can still have too many UIDs, split the requests and perform a union
            for (const valuesGroup of getChunks(inFilter.value)) {
                const filtersForGroup = [...nonInFilters, { ...inFilter, value: valuesGroup }];
                const usersForGroup = await getD2Users(d2, { filters: filtersForGroup });
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
