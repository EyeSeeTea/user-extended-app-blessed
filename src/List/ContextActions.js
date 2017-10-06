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
    .subscribe(({ data: model }) => {
        detailsStore.setState(model);
    });

/** Assign user to organization unit */
contextActions.assignToOrgUnits
    .subscribe(async ({ data: model }) => {
        const d2 = await getD2();
        const options = { fields: ":all,organisationUnits[id,path,displayName]" };
        const modelItem = await d2.models[model.modelDefinition.name].get(model.id, options);
        const userOrgUnitRoots = await appStateStore
            .map(appState => appState.userOrganisationUnits.toArray())
            .first().toPromise();

        orgUnitAssignmentDialogStore.setState({
            model: modelItem,
            roots: userOrgUnitRoots,
            open: true,
        });
    });

    /** Assign user to organization unit */
contextActions.assignToOrgUnitsOutput
.subscribe(async ({ data: model }) => {
    const d2 = await getD2();
    const options = { fields: ":all,organisationUnits[id,path,displayName]" };
    const modelItem = await d2.models[model.modelDefinition.name].get(model.id, options);
    const userOrgUnitRoots = await appStateStore
        .map(appState => appState.userOrganisationUnits.toArray())
        .first().toPromise();

    orgUnitAssignmentDialogStore.setState({
        model: modelItem,
        roots: userOrgUnitRoots,
        open: true,
    });
});

/** Assign roles */
contextActions.assignRoles
    .subscribe(({ data: model }) => {
        alert('Assign roles');
    });

/** Assign to groups */
contextActions.assignGroups
    .subscribe(({ data: model }) => {
        alert('Assign to groups');
    });

/** Edit user */
contextActions.edit
    .subscribe(({ data: model }) => {
        alert('Edit user');
    });

export default contextActions;
