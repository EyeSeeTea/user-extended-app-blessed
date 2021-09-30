import Store from "d2-ui/lib/store/Store";
import { getInstance as getD2 } from "d2/lib/d2";
import { Observable, Subject } from "rx";
import appState from "../App/appStateStore";
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

const columnObservable = appState
    .filter(appState => appState.sideBar && appState.sideBar.currentSubSection)
    .map(appState => appState.sideBar.currentSubSection)
    .distinctUntilChanged()
    .map(() => columns);

export default Store.create({
    listSourceSubject: new Subject(),
    listRolesSubject: new Subject(),
    listGroupsSubject: new Subject(),
    listOrgUnitsSubject: new Subject(),

    initialise() {
        this.listSourceSubject
            .concatAll()
            .combineLatest(columnObservable)
            .subscribe(([usersResponse, columns]) => {
                this.setState({
                    tableColumns: columns,
                    pager: usersResponse.pager,
                    list: usersResponse.users.map(user => ({
                        ...user,
                        ...(!user.userCredentials
                            ? {}
                            : {
                                  username: user.userCredentials.username,
                                  lastLogin: user.userCredentials.lastLogin,
                                  userRoles: user.userCredentials.userRoles,
                              }),
                    })),
                });
            });
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
                    this.listRolesSubject.onNext(res);
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
                    this.listGroupsSubject.onNext(res);
                });
            }
        });
    },

    getNextPage() {
        this.listSourceSubject.onNext(Observable.fromPromise(this.state.pager.getNextPage()));
    },

    getPreviousPage() {
        this.listSourceSubject.onNext(Observable.fromPromise(this.state.pager.getPreviousPage()));
    },

    filter(options, complete) {
        getD2().then(d2 => {
            const { filters, ...listOptions } = options;
            const listSearchPromise = getUserList(d2, filters, listOptions);
            this.listSourceSubject.onNext(Observable.fromPromise(listSearchPromise));
            complete(`list with filters '${filters}' is loading`);
        });
    },
}).initialise();
