import detailsStore from './details.store';
import { config, getInstance as getD2 } from 'd2/lib/d2';
import orgUnitAssignmentDialogStore from './organisation-unit-dialog/organisationUnitDialogStore';
import userRolesAssignmentDialogStore from './userRoles.store';
import userGroupsAssignmentDialogStore from './userGroups.store';
import appStateStore from '../App/appStateStore';
import _ from 'lodash';

async function assignToOrgUnits(selectedUser, field, titleKey) {
    const d2 = await getD2();
    const options = {fields: `:all,${field}[id,path,displayName]`};
    const user = await d2.models.user.get(selectedUser.model.id, options);
    const username = user.userCredentials.username;
    const userOrgUnitRoots = await appStateStore
        .map(appState => appState.userOrganisationUnits.toArray())
        .first().toPromise();

    orgUnitAssignmentDialogStore.setState({
        model: user,
        field: user[field],
        title: `${d2.i18n.getTranslation(titleKey)}: ${username}`,
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

const contextActions = [
    {
        name: 'details',
        multiple: false,
        onClick: user => detailsStore.setState(user),
        primary: true,
    },
    {
        name: 'assignToOrgUnits',
        multiple: false,
        icon: "business",
        onClick: user => assignToOrgUnits(user, "organisationUnits", "assignToOrgUnits"),
        allowed: checkAccess(["update"]),
    },
    {
        name: 'assignToOrgUnitsOutput',
        multiple: false,
        icon: "business",
        onClick: user => assignToOrgUnits(user, "dataViewOrganisationUnits", "assignToOrgUnitsOutput"),
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
];


export default contextActions