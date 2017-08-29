import { getInstance as getD2 } from 'd2/lib/d2';
import { Subject, Observable } from 'rx';
import Store from 'd2-ui/lib/store/Store';
import appState from '../App/appStateStore';

export const fieldFilteringForQuery =
    'displayName|rename(name),shortName,id,userCredentials[username],lastUpdated,created,' +
    'displayDescription,code,publicAccess,access,href,level';

const orderForQuery = (modelName) =>
    (modelName === 'organisationUnitLevel') ? 'level:ASC' : 'displayName:ASC'

const columnObservable = appState
    .filter(appState => appState.sideBar && appState.sideBar.currentSubSection)
    .map(appState => appState.sideBar.currentSubSection)
    .distinctUntilChanged()
    .map(subSection => {
        return ['name', 'username', 'lastUpdated'];
    });

export default Store.create({
    listSourceSubject: new Subject(),

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
                    }),
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

    getNextPage() {
        this.listSourceSubject.onNext(Observable.fromPromise(this.state.pager.getNextPage()));
    },

    getPreviousPage() {
        this.listSourceSubject.onNext(Observable.fromPromise(this.state.pager.getPreviousPage()));
    },

    async filter(modelType, searchString, canManage, complete, error) {
        getD2().then(d2 => {
            if (!d2.models[modelType]) {
                error(`${modelType} is not a valid schema name`);
            }

            let modelDefinition;
            if (searchString) {
                modelDefinition = d2.models[modelType]
                    .filter().on('displayName').ilike(searchString)
                    .filter().on('userCredentials.username').ilike(searchString);
            } else {
                modelDefinition = d2.models[modelType]
                    .filter().on('name').notEqual('default');
            }

            const listSearchPromise = modelDefinition
                .list({
                    fields: fieldFilteringForQuery,
                    rootJunction: "OR",
                    order: orderForQuery("user"),
                    canManage: canManage,
                });

            this.listSourceSubject.onNext(Observable.fromPromise(listSearchPromise));

            complete(`${modelType} list with search on 'displayName' for '${searchString}' is loading`);
        });
    
    },
}).initialise();
