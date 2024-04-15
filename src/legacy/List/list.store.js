import Store from "d2-ui/lib/store/Store";
import { getInstance as getD2 } from "d2/lib/d2";
import { Observable, Subject } from "rxjs/Rx";
import { getUserList } from "../models/userList";

export const columns = [
    { name: "username", sortable: false },
    { name: "firstName", sortable: true },
    { name: "surname", sortable: true },
    { name: "email", sortable: false },
    { name: "lastUpdated", sortable: true },
    { name: "created", sortable: true },
    { name: "userRoles", sortable: false },
    { name: "userGroups", sortable: false },
    { name: "organisationUnits", sortable: false },
    { name: "dataViewOrganisationUnits", sortable: false },
    { name: "lastLogin", sortable: false },
    { name: "disabled", sortable: false },
];

export default Store.create({
    listSourceSubject: new Subject(),
    listRolesSubject: new Subject(),
    listGroupsSubject: new Subject(),
    listOrgUnitsSubject: new Subject(),

    initialise() {
        return this;
    },

    getRoles() {
        getD2().then(d2 => {
            if (d2.models.userRoles) {
                const rolesPromise = d2.models.userRoles.list({
                    paging: false,
                    fields: "id,displayName",
                });
                Observable.fromPromise(rolesPromise).subscribe(res => {
                    this.listRolesSubject.next(res);
                });
            }
        });
    },

    getGroups() {
        getD2().then(d2 => {
            if (d2.models.userGroups) {
                const groupsPromise = d2.models.userGroups.list({
                    paging: false,
                    fields: "id,displayName",
                });
                Observable.fromPromise(groupsPromise).subscribe(res => {
                    this.listGroupsSubject.next(res);
                });
            }
        });
    },

    getNextPage() {
        this.listSourceSubject.next(Observable.fromPromise(this.state.pager.getNextPage()));
    },

    getPreviousPage() {
        this.listSourceSubject.next(Observable.fromPromise(this.state.pager.getPreviousPage()));
    },

    filter(options, complete) {
        getD2().then(d2 => {
            const { filters, ...listOptions } = options;
            const listSearchPromise = getUserList(d2, filters, listOptions);
            this.listSourceSubject.next(Observable.fromPromise(listSearchPromise));
            complete(`list with filters '${filters}' is loading`);
        });
    },
}).initialise();
