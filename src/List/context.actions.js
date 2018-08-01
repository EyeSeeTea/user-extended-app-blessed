import detailsStore from './details.store';
import { config, getInstance as getD2 } from 'd2/lib/d2';
import orgUnitAssignmentDialogStore from './organisation-unit-dialog/organisationUnitDialogStore';
import userRolesAssignmentDialogStore from './userRoles.store';
import userGroupsAssignmentDialogStore from './userGroups.store';
import replicateUserStore from './replicateUser.store';
import appStateStore from '../App/appStateStore';
import _m from '../utils/lodash-mixins';

async function assignToOrgUnits(selectedUsers, field, titleKey) {
    const d2 = await getD2();
    const userIds = selectedUsers.map(u => u.model.id);
    const listOptions = {
        paging: false,
        fields: `:owner,${field}[id,path,displayName]`,
        filter: `id:in:[${userIds.join(',')}]`,
    };
    const users = (await d2.models.users.list(listOptions)).toArray();
    const usernames = users.map(user => user.userCredentials.username);
    const info = _m.joinString(d2.i18n.getTranslation.bind(d2.i18n), usernames, 3, ", ");
    const userOrgUnitRoots = await appStateStore
        .map(appState => appState.userOrganisationUnits.toArray())
        .first().toPromise();

    orgUnitAssignmentDialogStore.setState({
        users: users,
        field: field,
        title: `${d2.i18n.getTranslation(titleKey)}: ${info}`,
        roots: userOrgUnitRoots,
        open: true,
    });
}

async function goToUserEditPage(user) {
    const d2 = await getD2();
    const baseUrl = d2.system.systemInfo.contextPath;
    const url = `${baseUrl}/dhis-web-maintenance-user/alluser.action?key=${user.username}`;
    window.open(url, '_blank');
}

function checkAccess(requiredKeys) {
    const toArray = obj => obj instanceof Array ? obj : [obj];
    return (rows) => {
        return _(toArray(rows)).every(row =>
            _(requiredKeys).difference(_(row.model.access).pickBy().keys().value()).isEmpty());
    };
}

function isAdmin(rows) {
    if (rows && rows.length > 0) {
        const { authorities } = rows[0].d2.currentUser;
        return authorities.has("ALL");
    } else {
        return false;
    }
}

const contextActions = [
    {
        name: 'details',
        multiple: false,
        onClick: user => detailsStore.setState(user),
        primary: true,
    },
    {
        name: 'assignToOrgUnits',
        multiple: true,
        icon: "business",
        onClick: users => assignToOrgUnits(users, "organisationUnits", "assignToOrgUnits"),
        allowed: checkAccess(["update"]),
    },
    {
        name: 'assignToOrgUnitsOutput',
        multiple: true,
        icon: "business",
        onClick: users => assignToOrgUnits(users, "dataViewOrganisationUnits", "assignToOrgUnitsOutput"),
        allowed: checkAccess(["update"]),
    },
    {
        name: 'assignRoles',
        multiple: true,
        icon: "assignment",
        onClick: users => userRolesAssignmentDialogStore.setState({users, open: true}),
        allowed: checkAccess(["update"]),
    },
    {
        name: 'assignGroups',
        icon: "group_add",
        multiple: true,
        onClick: users => userGroupsAssignmentDialogStore.setState({users, open: true}),
        allowed: checkAccess(["update"]),
    },
    {
        name: 'edit',
        multiple: false,
        onClick: user => goToUserEditPage(user),
        allowed: checkAccess(["update"]),
    },
    {
        name: 'replicateUser',
        icon: "content_copy",
        multiple: false,
        allowed: isAdmin,
        items: [
            {
                name: 'replicate_user_from_template',
                onClick: users => replicateUserStore.setState({open: true, user: users[0], type: "template"}),
            },
            {
                name: 'replicate_user_from_table',
                onClick: users => replicateUserStore.setState({open: true, user: users[0], type: "table"}),
            },
        ]
    },
];


export default contextActions