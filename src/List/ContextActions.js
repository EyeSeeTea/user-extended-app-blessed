import Action from 'd2-ui/lib/action/Action';
import detailsStore from './details.store';
import { config, getInstance as getD2 } from 'd2/lib/d2';
import orgUnitAssignmentDialogStore from './organisation-unit-dialog/organisationUnitDialogStore';
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

/** Show user details */
contextActions.details
    .subscribe(({ data: row }) => {
        detailsStore.setState(row);
    });

/** Assign user to organization units */
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

    /** Assign user to out organization units */
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

/** Assign roles */
contextActions.assignRoles
    .subscribe(({ data: {model} }) => {
        alert('Assign roles');
    });

/** Assign to groups */
contextActions.assignGroups
    .subscribe(({ data: {model} }) => {
        alert('Assign to groups');
    });

/** Edit user */
contextActions.edit
    .subscribe(({ data: {model} }) => {
        alert('Edit user');
    });

export default contextActions;
