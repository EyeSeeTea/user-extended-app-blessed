import detailsStore from './details.store';
import { config, getInstance as getD2 } from 'd2/lib/d2';
import orgUnitAssignmentDialogStore from './organisation-unit-dialog/organisationUnitDialogStore';
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
        title: `${d2.i18n.getTranslation('assignToOrgUnits')}: ${username}`,
        roots: userOrgUnitRoots,
        open: true,
    });
}

const toArray = obj => obj instanceof Array ? obj : [obj];
const readAccess = rows => _(toArray(rows)).every(row => row.model.access.read);
const writeAccess = rows => _(toArray(rows)).every(row => row.model.access.write);

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
        allowed: writeAccess,
    },
    {
        name: 'assignToOrgUnitsOutput',
        multiple: false,
        icon: "business",
        onClick: user => assignToOrgUnits(user, "dataViewOrganisationUnits", "assignToOrgUnitsOutput"),
        allowed: writeAccess,
    },
    {
        name: 'assignRoles',
        multiple: true,
        icon: "assignment",
        onClick: user => alert("TODO"),
        allowed: writeAccess,
    },
    {
        name: 'assignGroups',
        icon: "group_add",
        multiple: true,
        onClick: user => alert("TODO"),
        allowed: writeAccess,
    },
    {
        name: 'edit',
        multiple: false,
        onClick: user => alert("TODO"),
        allowed: writeAccess,
    },
];


export default contextActions