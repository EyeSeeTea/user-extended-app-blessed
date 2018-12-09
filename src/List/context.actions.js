import detailsStore from './details.store';
import { config, getInstance as getD2 } from 'd2/lib/d2';
import orgUnitAssignmentDialogStore from './organisation-unit-dialog/organisationUnitDialogStore';
import enableStore from './enable.store';
import userRolesAssignmentDialogStore from './userRoles.store';
import userGroupsAssignmentDialogStore from './userGroups.store';
import replicateUserStore from './replicateUser.store';
import deleteUserStore from './deleteUser.store';
import _m from '../utils/lodash-mixins';
import { getOrgUnitsRoots } from '../utils/dhis2Helpers';

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
    const compare = (x, y) => x < y ? -1 : (x === y ? 0 : 1);
    return _(xs).zipWith(ys, compare).find() || 0;
}

async function goToUserEditPage(user) {
    const d2 = await getD2();
    const baseUrl = d2.system.systemInfo.contextPath;
    const { major, minor } = d2.system.version;
    // DHIS2 >= 2.30 uses a new React user-app
    const url = lexicographicalCompare([major, minor], [2, 30]) >= 0
        ? `${baseUrl}/dhis-web-user/index.html#/users/edit/${user.id}`
        : `${baseUrl}/dhis-web-maintenance-user/alluser.action?key=${user.username}`;

    window.open(url, '_blank');
}

function checkAccess(requiredKeys) {
    const toArray = obj => obj instanceof Array ? obj : [obj];
    return (rows) => {
        return _(toArray(rows)).every(row =>
            _(requiredKeys).difference(_(row.model.access).pickBy().keys().value()).isEmpty());
    };
}

function isStateActionVisible(action) {
    const currentUserHasUpdateAccessOn = checkAccess("update");
    const requiredDisabledValue = action === 'enable';

    return users => (
        currentUserHasUpdateAccessOn(users) &&
            _(users).some(user => user.disabled === requiredDisabledValue)
    );
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
        name: 'enable',
        multiple: true,
        icon: 'playlist_add_check',
        onClick: users =>  enableStore.setState({users, action: 'enable'}),
        allowed: isStateActionVisible('enable'),
    },
    {
        name: 'disable',
        multiple: true,
        icon: 'block',
        onClick: users =>  enableStore.setState({users, action: 'disable'}),
        allowed: isStateActionVisible('disable'),
    },
    {
        name: 'remove',
        icon: 'delete',
        multiple: true,
        allowed: checkAccess(["delete"]),
        onClick: datasets => deleteUserStore.delete(datasets),
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