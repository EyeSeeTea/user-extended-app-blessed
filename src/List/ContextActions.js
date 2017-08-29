import Action from 'd2-ui/lib/action/Action';
import detailsStore from './details.store';
import { config, getInstance as getD2 } from 'd2/lib/d2';
import orgUnitAssignmentDialogStore from './organisation-unit-dialog/organisationUnitDialogStore';
import appStateStore from '../App/appStateStore';

config.i18n.strings.add('details');
config.i18n.strings.add('assignToOrgUnits');

const contextActions = Action.createActionsFromNames([
    'details',
    'assignToOrgUnits'
]);

contextActions.details
    .subscribe(({ data: model }) => {
        detailsStore.setState(model);
    });
    
contextActions.assignToOrgUnits
    .subscribe(async({ data: model }) => {
        const d2 = await getD2();
        const options = {fields: ":all,organisationUnits[id,path,displayName]"};
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

export default contextActions;
