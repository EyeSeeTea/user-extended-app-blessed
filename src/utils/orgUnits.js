import appStateStore from '../App/appStateStore';

export function getOrgUnitsRoots() {
    return appStateStore
        .map(appState => appState.userOrganisationUnits.toArray())
        .first()
        .toPromise();
}
