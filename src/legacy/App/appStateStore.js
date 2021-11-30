import Store from "d2-ui/lib/store/Store";
import { getInstance } from "d2/lib/d2";
import "rxjs/add/operator/distinctUntilChanged";
import "rxjs/add/operator/filter";
import "rxjs/add/operator/map";
import snackActions from "../Snackbar/snack.actions";

const appState = Store.create();

// d2/src/current-user/CurrentUser.js#getOrganisationUnits + children[shortName]
const orgUnitListOptions = {
    fields: ":all,shortName,displayName,path,children[id,shortName,displayName,path,children::isNotEmpty]",
    paging: false,
};

// TODO: Move the caching of these organisation units to d2.currentUser instead
async function getCurrentUserOrganisationUnits(disableCache = false) {
    if (!disableCache && getCurrentUserOrganisationUnits.currentUserOrganisationUnits) {
        return getCurrentUserOrganisationUnits.currentUserOrganisationUnits;
    }

    const d2 = await getInstance();
    const organisationUnitsCollection = await d2.currentUser.getOrganisationUnits(orgUnitListOptions);

    if (d2.currentUser.authorities.has("ALL") && !organisationUnitsCollection.size) {
        const rootLevelOrgUnits = await d2.models.organisationUnits.list({
            ...orgUnitListOptions,
            level: 1,
        });

        getCurrentUserOrganisationUnits.currentUserOrganisationUnits = rootLevelOrgUnits;

        if (rootLevelOrgUnits.size === 0) {
            snackActions.show({
                message: "no_org_units_add_one_to_get_started",
                translate: true,
            });
        }

        return rootLevelOrgUnits;
    }

    getCurrentUserOrganisationUnits.currentUserOrganisationUnits = organisationUnitsCollection;

    return organisationUnitsCollection;
}

export async function reloadUserOrganisationUnits() {
    const userOrganisationUnits = await getCurrentUserOrganisationUnits(true);

    appState.setState({
        ...appState.getState(),
        userOrganisationUnits,
    });
}

export default appState;

export function setAppState(newPartialState) {
    appState.setState(Object.assign({}, appState.state, newPartialState));
}
