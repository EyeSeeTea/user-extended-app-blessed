import { D2Api, D2UserSchema, SelectedPick, MetadataResponse, PostOptions, MetadataPayloadBase, D2ApiDefinition } from "@eyeseetea/d2-api/2.34";
import _ from "lodash";
import { Future, FutureData } from "../../domain/entities/Future";
import { PaginatedResponse } from "../../domain/entities/PaginatedResponse";
import { User } from "../../domain/entities/User";
import { ListOptions, UserRepository } from "../../domain/repositories/UserRepository";
import { cache } from "../../utils/cache";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { Instance } from "../entities/Instance";
import { UserModel } from "../models/UserModel";
import { ListFilters, ListFilterType } from "../../domain/repositories/UserRepository";

interface MetadataPost {
    data:Partial<MetadataPayloadBase<D2ApiDefinition["schemas"]>>;
    options: Partial<PostOptions>
}
export class UserD2ApiRepository implements UserRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    @cache()
    public getCurrent(): FutureData<User> {
        return apiToFuture(this.api.currentUser.get({ fields })).map(user => this.mapUser(user));
    }

    public list(options: ListOptions): FutureData<PaginatedResponse<User>> {
        const { page, pageSize, search, sorting = { field: "firstName", order: "asc" }, filters } = options;
        const otherFilters = _.mapValues(filters, items => (items ? { [items[0]]: items[1] } : undefined));

        return apiToFuture(
            this.api.models.users.get({
                fields,
                page,
                pageSize,
                query: search !== "" ? search : undefined,
                filter: otherFilters,
                order: `${sorting.field}:${sorting.order}`,
            })
        ).map(({ objects, pager }) => ({
            pager,
            objects: objects.map(user => this.mapUser(user)),
        }));
    }

    public listAllIds(options: ListOptions): FutureData<string[]> {
        const { search, sorting = { field: "firstName", order: "asc" }, filters } = options;
        const otherFilters = _.mapValues(filters, items => (items ? { [items[0]]: items[1] } : undefined));

        return apiToFuture(
            this.api.models.users.get({
                fields: { id: true },
                paging: false,
                query: search !== "" ? search : undefined,
                filter: otherFilters,
                order: `${sorting.field}:${sorting.order}`,
            })
        ).map(({ objects }) => objects.map(user => user.id));
    }

    public getById(id: string): FutureData<User> {
        return apiToFuture(this.api.models.users.get({ fields, filter: { id: { eq: id } } })).flatMap(({ objects }) => {
            const [user] = objects;
            if (!user) return Future.error(`User ${id} not found`);

            return Future.success(this.mapUser(user));
        });
    }

    private getFullUsers(options: ListOptions): FutureData<any[]> {
        const { page, pageSize, search, sorting = { field: "firstName", order: "asc" }, filters } = options;
        const otherFilters = _.mapValues(filters, items => (items ? { [items[0]]: items[1] } : undefined));

        const predictorData$ = apiToFuture(
            this.api.models.users.get({
                fields,
                page,
                pageSize,
                paging: false,
                filter: {
                    identifiable: search ? { token: search } : undefined,
                    ...otherFilters,
                },
                order: `${sorting.field}:${sorting.order}`,
            })
        );
        return predictorData$.map(({ objects }) => objects);
    }
   
    public save(usersToSave: User[]): FutureData<MetadataResponse> {
        console.log(usersToSave)
        const validations = usersToSave.map(user => UserModel.decode(user));
        const users = _.compact(validations.map(either => either.toMaybe().extract()));
        console.log(users)
        const errors = _.compact(validations.map(either => either.leftOrDefault("")));
        console.log(errors)

        if (errors.length > 0) {
            return Future.error(errors.join("\n"));
        }
        const userIds = users.map(user => user.id);
        const listOptions = {
            filters: { id: ["in" as ListFilterType, userIds] } as ListFilters,
        };

        return this.getFullUsers(listOptions).flatMap(existingUsers => {
            console.log(existingUsers)
            return this.getGroupsToSave(users, existingUsers).flatMap(userGroups => {
                const usersToSend = existingUsers.map((existingUser, index) => ({
                    ...existingUser,
                    organisationUnits: usersToSave[index]?.organisationUnits,
                    dataViewOrganisationUnits: usersToSave[index]?.dataViewOrganisationUnits,
                    email: usersToSave[index]?.email,
                    firstName: usersToSave[index]?.firstName,
                    surname: usersToSave[index]?.surname,
                    userCredentials: {
                        ...existingUser.userCredentials,
                        disabled: usersToSave[index]?.disabled,
                        userRoles: usersToSave[index]?.userRoles,
                        username: usersToSave[index]?.username,
                    },
                }));
                 return apiToFuture(this.api.metadata.post({ users: usersToSend, userGroups })).map(data => data);
            })
           
            /*console.log(usersToSend)
            //importStrategy=UPDATE&mergeMode=REPLACE
            const payload: MetadataPost  = {
                data: { users: usersToSend }, 
                options: { importStrategy: "UPDATE", mergeMode: "REPLACE"}  
            }
            return apiToFuture(this.api.metadata.post({ users: usersToSend })).map(data => data);*/
        });
    }
    private getGroupsToSave(users: User[], existing: User[]) {
        const userIds = users.map(({ id }) => id);
        const groupDictionary = _(users)
            .flatMap(({ id, userGroups }) => userGroups.map(group => ({ id, group })))
            .groupBy(({ group }) => group.id)
            .mapValues(items => items.map(({ id }) => id))
            .value();

        const existingGroupRefs = _.flatMap(existing, ({ userGroups }) => userGroups);
        const newGroupRefs = _.flatMap(users, ({ userGroups }) => userGroups);
        const allGroupRefs = _.concat(existingGroupRefs, newGroupRefs);

        const groupInfo$ = apiToFuture(
            this.api.metadata.get({
                userGroups: {
                    fields: { $owner: true },
                    filter: { id: { in: _.uniq(allGroupRefs.map(oug => oug.id)) } }, // Review 414
                },
            })
        );

        return groupInfo$.map(({ userGroups }) =>
            userGroups
                .map(group => {
                    const cleanList = group.users.filter(({ id }) => !userIds.includes(id));
                    const newItems = groupDictionary[group.id] ?? [];
                    const users = [...cleanList, ...newItems.map(id => ({ id }))];

                    return { ...group, users };
                })
                .filter(group => {
                    const newIds = group.users.map(({ id }) => id);
                    const oldIds =
                        userGroups.find(({ id }) => id === group.id)?.users.map(({ id }) => id) ?? [];

                    return !_.isEqual(_.sortBy(oldIds), _.sortBy(newIds));
                })
        );
    }

    private mapUser(user: D2ApiUser): User {
        const { userCredentials } = user;
        const authorities = _(userCredentials.userRoles.map(userRole => userRole.authorities)).flatten().uniq().value()
        return {
            id: user.id,
            name: user.displayName,
            firstName: user.firstName,
            surname: user.surname,
            email: user.email,
            lastUpdated: new Date(user.lastUpdated),
            created: new Date(user.created),
            userGroups: user.userGroups,
            username: user.userCredentials.username,
            apiUrl: `${this.api.baseUrl}/api/users/${user.id}.json`,
            userRoles: user.userCredentials.userRoles.map(userRole => ({ id: userRole.id, name: userRole.name})),
            lastLogin: userCredentials.lastLogin ? new Date(userCredentials.lastLogin) : undefined,
            disabled: user.userCredentials.disabled,
            organisationUnits: user.organisationUnits,
            dataViewOrganisationUnits: user.dataViewOrganisationUnits,
            access: user.access,
            openId: userCredentials.openId,
            authorities
        };
    }
}

const fields = {
    id: true,
    displayName: true,
    firstName: true,
    surname: true,
    email: true,
    lastUpdated: true,
    created: true,
    userGroups: { id: true, name: true },
    userCredentials: {
        username: true,
        userRoles: { id: true, name: true, authorities: true },
        lastLogin: true,
        disabled: true,
        openId: true,
    },
    organisationUnits: { id: true, name: true },
    dataViewOrganisationUnits: { id: true, name: true },
    access: true,
} as const;

type D2ApiUser = SelectedPick<D2UserSchema, typeof fields>;
