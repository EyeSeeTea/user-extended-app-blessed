import { D2Api, D2UserSchema, MetadataResponse, SelectedPick } from "@eyeseetea/d2-api/2.34";
import _ from "lodash";
import { Future, FutureData } from "../../domain/entities/Future";
import { PaginatedResponse } from "../../domain/entities/PaginatedResponse";
import { User } from "../../domain/entities/User";
import { ListOptions, UserRepository } from "../../domain/repositories/UserRepository";
import { cache } from "../../utils/cache";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { Instance } from "../entities/Instance";
import { ApiUserModel } from "../models/UserModel";

export class UserD2ApiRepository implements UserRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    @cache()
    public getCurrent(): FutureData<User> {
        return apiToFuture(this.api.currentUser.get({ fields })).map(user => this.toDomainUser(user));
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
            objects: objects.map(user => this.toDomainUser(user)),
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

            return Future.success(this.toDomainUser(user));
        });
    }

    public getByIds(ids: string[]): FutureData<User[]> {
        return apiToFuture(this.api.models.users.get({ fields, filter: { id: { in: ids } } })).flatMap(
            ({ objects }) => {
                return Future.success(objects.map(user => this.toDomainUser(user)));
            }
        );
    }

    private getFullUsers(options: ListOptions): FutureData<ApiUser[]> {
        const { page, pageSize, search, sorting = { field: "firstName", order: "asc" }, filters } = options;
        const otherFilters = _.mapValues(filters, items => (items ? { [items[0]]: items[1] } : undefined));

        const userData$ = apiToFuture(
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
        return userData$.map(({ objects }) => objects);
    }

    public save(usersToSave: User[]): FutureData<MetadataResponse> {
        const validations = usersToSave.map(user => ApiUserModel.decode(this.toApiUser(user)));
        const users = _.compact(validations.map(either => either.toMaybe().extract()));
        const errors = _.compact(validations.map(either => either.leftOrDefault("")));

        if (errors.length > 0) {
            return Future.error(errors.join("\n"));
        }

        const userIds = users.map(user => user.id);

        return this.getFullUsers({ filters: { id: ["in", userIds] } }).flatMap(existingUsers => {
            return this.getGroupsToSave(users, existingUsers).flatMap(userGroups => {
                const usersToSend = existingUsers.map((existingUser, index) => {
                    const user = users[index];

                    return {
                        ...existingUser,
                        organisationUnits: user?.organisationUnits,
                        dataViewOrganisationUnits: user?.dataViewOrganisationUnits,
                        email: user?.email,
                        firstName: user?.firstName,
                        surname: user?.surname,
                        userCredentials: {
                            ...existingUser.userCredentials,
                            disabled: user?.userCredentials.disabled,
                            userRoles: user?.userCredentials.userRoles,
                            username: user?.userCredentials.username,
                        },
                    };
                });

                return apiToFuture(this.api.metadata.post({ users: usersToSend, userGroups })).map(data => data);
            });
        });
    }

    private getGroupsToSave(users: ApiUser[], existing: ApiUser[]) {
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
                    const oldIds = userGroups.find(({ id }) => id === group.id)?.users.map(({ id }) => id) ?? [];

                    return !_.isEqual(_.sortBy(oldIds), _.sortBy(newIds));
                })
        );
    }

    private toDomainUser(input: ApiUser): User {
        const { userCredentials, ...user } = input;
        const authorities = _(userCredentials.userRoles.map(userRole => userRole.authorities))
            .flatten()
            .uniq()
            .value();

        return {
            id: user.id,
            name: user.name,
            firstName: user.firstName,
            surname: user.surname,
            email: user.email,
            lastUpdated: new Date(user.lastUpdated),
            created: new Date(user.created),
            userGroups: user.userGroups,
            username: userCredentials.username,
            apiUrl: `${this.api.baseUrl}/api/users/${user.id}.json`,
            userRoles: userCredentials.userRoles.map(userRole => ({ id: userRole.id, name: userRole.name })),
            lastLogin: userCredentials.lastLogin ? new Date(userCredentials.lastLogin) : undefined,
            disabled: userCredentials.disabled,
            organisationUnits: user.organisationUnits,
            dataViewOrganisationUnits: user.dataViewOrganisationUnits,
            access: user.access,
            openId: userCredentials.openId,
            authorities,
        };
    }

    private toApiUser(input: User): ApiUser {
        return {
            id: input.id,
            name: input.name,
            firstName: input.firstName,
            surname: input.surname,
            email: input.email,
            lastUpdated: input.lastUpdated.toISOString(),
            created: input.created.toISOString(),
            userGroups: input.userGroups,
            organisationUnits: input.organisationUnits,
            dataViewOrganisationUnits: input.dataViewOrganisationUnits,
            access: input.access,
            userCredentials: {
                username: input.username,
                userRoles: input.userRoles.map(userRole => ({ id: userRole.id, name: userRole.name, authorities: [] })),
                lastLogin: input.lastLogin?.toISOString() ?? "",
                disabled: input.disabled,
                openId: input.openId ?? "",
            },
        };
    }
}

const fields = {
    id: true,
    name: true,
    firstName: true,
    surname: true,
    email: true,
    lastUpdated: true,
    created: true,
    userGroups: { id: true, name: true },
    organisationUnits: { id: true, name: true },
    dataViewOrganisationUnits: { id: true, name: true },
    access: true,
    userCredentials: {
        username: true,
        userRoles: { id: true, name: true, authorities: true },
        lastLogin: true,
        disabled: true,
        openId: true,
    },
} as const;

export type ApiUser = SelectedPick<D2UserSchema, typeof fields>;
