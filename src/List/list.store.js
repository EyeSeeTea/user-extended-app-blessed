import { getInstance as getD2 } from 'd2/lib/d2';
import { Subject, Observable } from 'rx';
import Store from 'd2-ui/lib/store/Store';
import _ from 'lodash';

import appState from '../App/appStateStore';

export const fieldFilteringForQuery = [
    'displayName|rename(name)',
    'shortName',
    'firstName',
    'surname',
    'created',
    'email',
    'id',
    'userCredentials[username, userRoles[id,displayName],lastLogin]',
    'lastUpdated',
    'created',
    'displayDescription',
    'code',
    'publicAccess',
    'access',
    'href',
    'level',
    'userGroups[id,displayName,publicAccess]',
    'organisationUnits[id,displayName]',
    'dataViewOrganisationUnits[id,displayName]',
].join(",");

const orderForQuery = (modelName) =>
    (modelName === 'organisationUnitLevel') ? 'level:ASC' : 'name:iasc';

const columns = [
    {name: 'username', sortable: false},
    {name: 'firstName', sortable: true},
    {name: 'surname', sortable: true},
    {name: 'email', sortable: false},
    {name: 'lastUpdated', sortable: true},
    {name: 'created', sortable: true},
    {name: 'userRoles', sortable: false},
    {name: 'userGroups', sortable: false},
    {name: 'organisationUnits', sortable: false},
    {name: 'dataViewOrganisationUnits', sortable: false},
    {name: 'lastLogin', sortable: false},
];

const columnObservable = appState
    .filter(appState => appState.sideBar && appState.sideBar.currentSubSection)
    .map(appState => appState.sideBar.currentSubSection)
    .distinctUntilChanged()
    .map(subSection => columns);

export default Store.create({
    listSourceSubject: new Subject(),
    listRolesSubject: new Subject(),
    listGroupsSubject: new Subject(),
    listOrgUnitsSubject: new Subject(),

    initialise() {
        this.listSourceSubject
            .concatAll()
            .combineLatest(columnObservable)
            .subscribe(([modelCollection, columns]) => {
                this.setState({
                    tableColumns: columns,
                    pager: modelCollection.pager,
                    list: modelCollection.toArray().map(user => {
                        user.username = user.userCredentials && user.userCredentials.username;
                        return user;
                    })
                });
            });
        return this;
    },

    getListFor(modelName, complete, error) {
        getD2().then(d2 => {
            if (d2.models[modelName]) {
                const listPromise = d2.models[modelName]
                    .filter().on('name').notEqual('default')
                    .list({
                        fields: fieldFilteringForQuery,
                        order: orderForQuery(modelName),
                    });

                this.listSourceSubject.onNext(Observable.fromPromise(listPromise));

                complete(`${modelName} list loading`);
            } else {
                error(`${modelName} is not a valid schema name`);
            }
        });
    },

    getRoles() {
        getD2().then(d2 => {
            if (d2.models.userRoles) {
                const rolesPromise = d2.models.userRoles.list({paging: false, fields: "id,displayName"});
                Observable.fromPromise(rolesPromise).subscribe(res => {
                    this.listRolesSubject.onNext(res);
                });
            }
        });
    },

    getGroups() {
        getD2().then(d2 => {
            if (d2.models.userGroups) {
                const groupsPromise = d2.models.userGroups.list({paging: false, fields: "id,displayName"});
                Observable.fromPromise(groupsPromise).subscribe(res => {
                    this.listGroupsSubject.onNext(res);
                });
            }
        });
    },

    getOrgUnits() {
        getD2().then(d2 => {
            if (d2.models.organisationUnits) {
                const orgUnitsPromise = d2.models.organisationUnits.list({paging: false, fields: "id,displayName"});
                Observable.fromPromise(orgUnitsPromise).subscribe(res => {
                    this.listOrgUnitsSubject.onNext(res);
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

    async filter(modelType, canManage, filters, order, page, pageSize, complete, error) {
        getD2().then(d2 => {
            if (!d2.models[modelType]) {
                error(`${modelType} is not a valid schema name`);
            }

            /*  Filtering over nested fields (table[.table].field) in N-to-N relationships (for
                example: userCredentials.userRoles.id), fails in dhis2 < v2.30. So we need to make
                separate calls to the API for those filters and use the returned IDs to build
                the final, paginated call. */

            // Limit Uids to avoid 413 Request too large
            // maxUids = (maxSize - urlAndOtherParamsSize) / (uidSize + encodedCommaSize)
            const maxUids = (8192 - 1000) / (11 + 3);

            const model = d2.models[modelType];
            const buildD2Filter = filters =>
                _(filters).map(([key, [operator, value]]) =>
                    [key, operator, _.isArray(value) ? `[${_(value).take(maxUids).join(",")}]` : value].join(":")).value();
            const activeFilters =
                _(filters).pickBy(([operator, value], field) => value).toPairs().value();
            const [preliminarFilters, normalFilters] =
                _(activeFilters).partition(([key, opValue]) => key.match(/\./)).value();
            const preliminarD2Filters$ = preliminarFilters.map(preliminarFilter =>
                model
                    .list({
                        paging: false,
                        fields: fieldFilteringForQuery,
                        filter: buildD2Filter([preliminarFilter]),
                    })
                    .then(collection => collection.toArray().map(obj => obj.id))
                    .then(ids => `id:in:[${_(ids).take(maxUids).join(",")}]`));
            const listSearchPromise = Promise.all(preliminarD2Filters$).then(preliminarD2Filters => {
                const filters = buildD2Filter(normalFilters).concat(preliminarD2Filters);
                return model.list({
                    paging: true,
                    pageSize: pageSize,
                    page: page,
                    fields: fieldFilteringForQuery,
                    order: order || orderForQuery("user"),
                    canManage: canManage,
                    filter: _(filters).isEmpty() ? "name:ne:default" : filters,
                });
            });

            this.listSourceSubject.onNext(Observable.fromPromise(listSearchPromise));
            complete(`${modelType} list with filters '${filters}' is loading`);
        });
    },
}).initialise();
