import { getInstance as getD2 } from "d2/lib/d2";
import _ from "lodash";
import { getOrgUnitsRoots } from "../utils/dhis2Helpers";
import _m from "../utils/lodash-mixins";
import orgUnitAssignmentDialogStore from "./organisation-unit-dialog/organisationUnitDialogStore";

export async function assignToOrgUnits(userIds, field, titleKey) {
    const d2 = await getD2();
    const listOptions = {
        paging: false,
        fields: `:owner,${field}[id,path,shortName,displayName]`,
        filter: `id:in:[${userIds.join(",")}]`,
    };
    const users = (await d2.models.users.list(listOptions)).toArray();
    const usernames = users.map(user => user.userCredentials.username);
    const info = _m.joinString(d2.i18n.getTranslation.bind(d2.i18n), usernames, 3, ", ");
    const userOrgUnitRoots = await getOrgUnitsRoots();

    orgUnitAssignmentDialogStore.setState({
        users: users,
        field: field,
        title: `${d2.i18n.getTranslation(titleKey)}: ${info}`,
        roots: userOrgUnitRoots,
        open: true,
    });
}

// Compare two arrays lexicographically and return -1 (if xs < ys), 0 (if xs == ys) or 1 (if xs > ys).
function lexicographicalCompare(xs, ys) {
    const compare = (x, y) => (x < y ? -1 : x === y ? 0 : 1);
    return _(xs).zipWith(ys, compare).find() || 0;
}

export async function goToUserEditPage(userId) {
    const d2 = await getD2();
    const user = (await d2.models.users.list({ filter: `id:in:[${userId}]` })).toArray().pop();
    const baseUrl = d2.system.systemInfo.contextPath;
    const { major, minor } = d2.system.version;
    // DHIS2 >= 2.30 uses a new React user-app
    const url =
        lexicographicalCompare([major, minor], [2, 30]) >= 0
            ? `${baseUrl}/dhis-web-user/index.html#/users/edit/${user.id}`
            : `${baseUrl}/dhis-web-maintenance-user/alluser.action?key=${user.username}`;

    window.open(url, "_blank");
}
