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

export async function goToUserEditPage(userId) {
    const url = `${baseUrl}/dhis-web-user/index.html#/users/edit/${userId}`;
    window.open(url, "_blank");
}
