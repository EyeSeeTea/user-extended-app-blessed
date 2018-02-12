import Action from 'd2-ui/lib/action/Action';
import detailsStore from './details.store';
import { config, getInstance as getD2 } from 'd2/lib/d2';
import orgUnitAssignmentDialogStore from './organisation-unit-dialog/organisationUnitDialogStore';
import userRolesAssignmentDialogStore from './userRoles.store';
import appStateStore from '../App/appStateStore';

config.i18n.strings.add('details');
config.i18n.strings.add('assignToOrgUnits');

const contextActions = Action.createActionsFromNames([
    'details',
    'assignToOrgUnits',
    'assignToOrgUnitsOutput',
    'assignRoles',
    'assignGroups',
    'edit'
]);

contextActions.details
    .subscribe(({ data: row }) => {
        detailsStore.setState(row);
    });

contextActions.assignToOrgUnits
    .subscribe(async ({ data: {model} }) => {
        const d2 = await getD2();
        const options = { fields: ":all,organisationUnits[id,path,displayName]" };
        const modelItem = await d2.models[model.modelDefinition.name].get(model.id, options);
        const username = modelItem.userCredentials.username;
        const userOrgUnitRoots = await appStateStore
            .map(appState => appState.userOrganisationUnits.toArray())
            .first().toPromise();

        orgUnitAssignmentDialogStore.setState({
            model: modelItem,
            field: modelItem.organisationUnits,
            title: `${d2.i18n.getTranslation('assignToOrgUnits')}: ${username}`,
            roots: userOrgUnitRoots,
            open: true,
        });
    });

contextActions.assignToOrgUnitsOutput
.subscribe(async ({ data: {model} }) => {
    const d2 = await getD2();
    const options = { fields: ":all,dataViewOrganisationUnits[id,path,displayName]" };
    const modelItem = await d2.models[model.modelDefinition.name].get(model.id, options);
    const username = modelItem.userCredentials.username;
    const userOrgUnitRoots = await appStateStore
        .map(appState => appState.userOrganisationUnits.toArray())
        .first().toPromise();

    orgUnitAssignmentDialogStore.setState({
        model: modelItem,
        title: `${d2.i18n.getTranslation('assignToOrgUnitsOutput')}: ${username}`,
        field: modelItem.dataViewOrganisationUnits,
        roots: userOrgUnitRoots,
        open: true,
    });
});

contextActions.assignRoles
    .subscribe(({ data: {model} }) => {
        userRolesAssignmentDialogStore.setState({
            user: model,
            open: true,
        });
    });

contextActions.assignGroups
    .subscribe(({ data: {model} }) => {
        alert('Assign to groups');
    });

contextActions.edit
    .subscribe(({ data: {model} }) => {
        alert('Edit user');
    });

export default contextActions;
