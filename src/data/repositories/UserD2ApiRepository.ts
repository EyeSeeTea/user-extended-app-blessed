import { D2Api, D2UserSchema, MetadataResponse, SelectedPick } from "@eyeseetea/d2-api/2.36";
import _ from "lodash";
import { Future, FutureData } from "../../domain/entities/Future";
import { OrgUnit } from "../../domain/entities/OrgUnit";
import { PaginatedResponse } from "../../domain/entities/PaginatedResponse";
import { Id, NamedRef } from "../../domain/entities/Ref";
import { Stats } from "../../domain/entities/Stats";
import { LocaleCode, User } from "../../domain/entities/User";
import { ListOptions, UpdateStrategy, UserRepository } from "../../domain/repositories/UserRepository";
import { cache } from "../../utils/cache";
import { getD2APiFromInstance, joinPaths } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { DataStoreStorageClient } from "../clients/storage/DataStoreStorageClient";
import { Namespaces } from "../clients/storage/Namespaces";
import { StorageClient } from "../clients/storage/StorageClient";
import { Instance } from "../entities/Instance";
import { ApiD2OrgUnit } from "../models/DHIS2Model";
import { ApiUserModel } from "../models/UserModel";
import { chunkRequest, getErrorFromResponse } from "../utils";

export class UserD2ApiRepository implements UserRepository {
    private api: D2Api;
    private userStorage: StorageClient;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
        this.userStorage = new DataStoreStorageClient("user", instance);
    }

    private getLocales(users: User[]): FutureData<User[]> {
        const $requests = users.map((user): FutureData<User> => {
            return apiToFuture(
                this.api.request<D2UserSettings>({
                    method: "get",
                    url: "/userSettings.json",
                    params: { user: user.username },
                })
            ).map((response): User => {
                return { ...user, uiLocale: response.keyUiLocale, dbLocale: response.keyDbLocale };
            });
        });

        return Future.parallel($requests, { maxConcurrency: 5 }).map(users => users);
    }

    private saveLocales(users: User[]): FutureData<void> {
        const $requests = users.flatMap(user => {
            return [this.saveLocaleRequest(user, "keyDbLocale"), this.saveLocaleRequest(user, "keyUiLocale")];
        });
        return Future.parallel($requests, { maxConcurrency: 2 }).map(() => undefined);
    }

    private saveLocaleRequest(user: User, keyLocale: KeyLocale): FutureData<void> {
        return apiToFuture(
            this.api.request({
                method: "post",
                url: `/userSettings/${keyLocale}.json`,
                params: { user: user.username, value: this.getLocaleValueByType(user, keyLocale) },
            })
        );
    }

    private getLocaleValueByType(user: User, keyLocale: KeyLocale): string {
        switch (keyLocale) {
            case DB_LOCALE_KEY:
                return user.dbLocale;
            case UI_LOCALE_KEY:
                return user.uiLocale;
        }
    }

    remove(users: User[]): FutureData<Stats> {
        const ids = users.map(user => user.id);
        return chunkRequest(ids, userIds => {
            return apiToFuture<Dhis2Response>(
                this.api.metadata.post({ users: userIds.map(id => ({ id: id })) }, { importStrategy: "DELETE" })
            ).flatMap(d2Response => {
                const res = d2Response.response ? d2Response.response : d2Response;
                return Future.success([
                    new Stats({
                        created: res.stats.created,
                        updated: res.stats.updated,
                        ignored: res.stats.ignored,
                        deleted: res.stats.deleted,
                        errorMessage: getErrorFromResponse(res.typeReports),
                    }),
                ]);
            });
        }).flatMap(stats => {
            return Future.success(Stats.combine(stats));
        });
    }

    @cache()
    public getCurrent(): FutureData<User> {
        return apiToFuture(this.api.currentUser.get({ fields })).map(user => this.toDomainUser(user));
    }

    public list(options: ListOptions): FutureData<PaginatedResponse<User>> {
        const {
            page,
            pageSize,
            search,
            sorting = { field: "firstName", order: "asc" },
            canManage,
            rootJunction,
            filters,
        } = options;
        const otherFilters = _.mapValues(filters, items => (items ? { [items[0]]: items[1] } : undefined));
        const areFiltersEnabled = _(otherFilters).values().some();

        const sortingField = sorting.field === "status" ? "disabled" : sorting.field;

        return apiToFuture(
            this.api.models.users.get({
                fields: {
                    ...fields,
                    ...auditFields,
                    userCredentials: { ...fields.userCredentials, ...auditFields },
                },
                page,
                pageSize,
                query: search !== "" ? search : undefined,
                canManage: canManage === "true" ? "true" : undefined,
                filter: otherFilters,
                rootJunction: areFiltersEnabled ? rootJunction : undefined,
                order: `${sortingField}:${sorting.order}`,
            })
        ).map(({ objects, pager }) => ({ pager, objects: objects.map(user => this.toDomainUser(user)) }));
    }

    public listAllIds(options: ListOptions): FutureData<string[]> {
        const { search, sorting = { field: "firstName", order: "asc" }, filters, canManage } = options;
        const otherFilters = _.mapValues(filters, items => (items ? { [items[0]]: items[1] } : undefined));

        return apiToFuture(
            this.api.models.users.get({
                fields: { id: true },
                paging: false,
                query: search !== "" ? search : undefined,
                canManage: canManage === "true" ? "true" : undefined,
                filter: otherFilters,
                order: `${sorting.field}:${sorting.order}`,
            })
        ).map(({ objects }) => objects.map(user => user.id));
    }

    public getByIds(ids: string[]): FutureData<User[]> {
        if (ids.length === 0) return Future.success([]);
        return this.getUsersByIds(ids);
    }

    private getUsersByIds(ids: Id[]): FutureData<User[]> {
        const $requests = chunkRequest(
            ids,
            usersIds => {
                return apiToFuture(
                    this.api.models.users.get({
                        paging: false,
                        fields: {
                            ...fields,
                            ...auditFields,
                            userCredentials: { ...fields.userCredentials, ...auditFields },
                        },
                        filter: { id: { in: usersIds } },
                        v: +new Date().getTime(),
                    })
                ).flatMap(({ objects }) => {
                    const users = objects.map(user => this.toDomainUser(user));
                    return this.getUsersGroups(usersIds).flatMap(d2UsersWithGroups => {
                        const usersWithGroups = this.addGroupsToUsers(users, d2UsersWithGroups);
                        return this.getLocales(usersWithGroups);
                    });
                });
            },
            50
        );

        return $requests.map(_.flatten);
    }

    private addGroupsToUsers(users: User[], d2UsersWithGroups: D2UserGroupByKey): User[] {
        return users.map((user): User => {
            const userGroups = d2UsersWithGroups[user.id] || [];
            return { ...user, userGroups: userGroups };
        });
    }

    private getUsersGroups(usersIds: Id[]): FutureData<D2UserGroupByKey> {
        const $requests = chunkRequest(usersIds, usersChunksIds => {
            return apiToFuture(
                this.api.models.userGroups.get({
                    filter: { "users.id": { in: usersChunksIds } },
                    fields: { id: true, displayName: true, users: true },
                    paging: false,
                })
            ).map(response => {
                return response.objects.map(d2Group => ({
                    id: d2Group.id,
                    name: d2Group.displayName,
                    users: d2Group.users,
                }));
            });
        });

        return $requests.map(d2UsersGroups => {
            const userGroups = _(d2UsersGroups)
                .flatMap(group => group.users.map(user => ({ userId: user.id, group })))
                .value();

            const groupedByUser = _(userGroups)
                .groupBy(ug => ug.userId)
                .mapValues(groups => groups.map(group => _.omit(group.group, ["users"])))
                .value();

            return groupedByUser;
        });
    }

    private getFullUsers(options: ListOptions): FutureData<ApiUser[]> {
        const { page, pageSize, search, sorting = { field: "firstName", order: "asc" }, filters } = options;
        const otherFilters = _.mapValues(filters, items => (items ? { [items[0]]: items[1] } : undefined));

        const userData$ = apiToFuture(
            this.api.models.users.get({
                fields: {
                    ...fields,
                    $owner: true,
                    userCredentials: { ...fields.userCredentials, $all: true },
                },
                page,
                pageSize,
                paging: false,
                filter: {
                    identifiable: search ? { token: search } : undefined,
                    ...otherFilters,
                },
                order: `${sorting.field}:${sorting.order}`,
                v: +new Date().getTime(),
            })
        );
        return userData$.flatMap(({ objects }) => {
            return this.getUsersGroups(objects.map(user => user.id)).map(d2UsersGroups => {
                const users = objects.map(user => {
                    const userGroups = d2UsersGroups[user.id] || [];
                    return { ...user, userGroups };
                });
                return users;
            });
        });
    }

    public listAll(
        options: ListOptions,
        state: { initialPage: number; users: User[] } = { initialPage: 1, users: [] }
    ): FutureData<User[]> {
        const { initialPage, users } = state;
        return this.list({ ...options, pageSize: 100, page: initialPage }).flatMap(({ pager, objects }) => {
            const newUsers = [...users, ...objects];
            if (pager.page >= pager.pageCount) {
                return Future.success(newUsers);
            } else {
                return this.listAll(options, {
                    initialPage: initialPage + 1,
                    users: newUsers,
                });
            }
        });
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
            const usersToSend = _(existingUsers)
                .map(existingUser => {
                    const user = users.find(user => user.id === existingUser.id);
                    if (!user) return undefined;
                    return this.buildUsersToSave(existingUser, user);
                })
                .compact()
                .value();

            return apiToFuture(this.api.metadata.post({ users: usersToSend })).flatMap(data => {
                return Future.joinObj({
                    saveLocales: this.saveLocales(usersToSave).map(() => data),
                    saveGroupsStats: this.updateUserGroups(users, existingUsers),
                }).map(() => data);
            });
        });
    }

    private buildUsersToSave(existingUser: ApiUser, user: ApiUser) {
        return {
            ...existingUser,
            ...user,
            // include these fields here and in userCredentials due to a bug in v2.38
            userRoles: user.userCredentials.userRoles,
            username: user.userCredentials.username,
            disabled: user.userCredentials.disabled,
            openId: user.userCredentials.openId,
            password: user.userCredentials.password,
            userCredentials: {
                ...existingUser.userCredentials,
                ...user.userCredentials,
                id: user.id,
                accountExpiry: user.userCredentials.accountExpiry ? user.userCredentials.accountExpiry : undefined,
            },
        };
    }

    public updateRoles(ids: string[], update: NamedRef[], strategy: UpdateStrategy): FutureData<MetadataResponse> {
        return this.getByIds(ids).flatMap(storedUsers => {
            const commonRoles = _.intersectionBy(
                ...storedUsers.map(user => user.userRoles.map(role => role)),
                ({ id }) => id
            );

            const users = storedUsers.map(user => {
                return {
                    ...user,
                    userRoles:
                        strategy === "merge"
                            ? _.uniqBy(
                                  [..._.differenceBy(user.userRoles, commonRoles, ({ id }) => id), ...update],
                                  ({ id }) => id
                              )
                            : update,
                };
            });

            return this.save(users);
        });
    }

    public updateGroups(ids: string[], update: NamedRef[], strategy: UpdateStrategy): FutureData<MetadataResponse> {
        return this.getByIds(ids).flatMap(storedUsers => {
            const commonGroups = _.intersectionBy(
                ...storedUsers.map(user => user.userGroups.map(group => group)),
                ({ id }) => id
            );

            const users = storedUsers.map(user => {
                return {
                    ...user,
                    userGroups:
                        strategy === "merge"
                            ? _.uniqBy(
                                  [..._.differenceBy(user.userGroups, commonGroups, ({ id }) => id), ...update],
                                  ({ id }) => id
                              )
                            : update,
                };
            });

            return this.save(users);
        });
    }

    public getColumns(): FutureData<Array<keyof User>> {
        const $request = this.userStorage.getOrCreateObject<Array<keyof User>>(
            Namespaces.VISIBLE_COLUMNS,
            defaultColumns
        );
        return $request.flatMap(columns => {
            const result = columns.length ? columns : defaultColumns;
            return Future.success(result);
        });
    }

    public saveColumns(columns: Array<keyof User>): FutureData<void> {
        return this.userStorage.saveObject<Array<keyof User>>(Namespaces.VISIBLE_COLUMNS, columns);
    }

    updateUserGroups(users: ApiUser[], existing: ApiUser[]): FutureData<Stats> {
        const allUsersGroups = this.buildUsersByGroupId(users);
        const allExistingUsersGroups = this.buildUsersByGroupId(existing);

        const groupsIdsToAdd = users.flatMap(user => {
            return user.userGroups.map(userGroup => ({ id: userGroup.id }));
        });

        const groupsIdsToDelete = users.flatMap(user => {
            const existingUser = existing.find(({ id }) => id === user.id);
            const difference = _.differenceWith(existingUser?.userGroups, user.userGroups, _.isEqual);
            return difference.map(userGroup => ({ id: userGroup.id }));
        });

        const $requestsToAdd = this.buildRequestsGroups(groupsIdsToAdd, allUsersGroups, "add");
        const $requestsToDelete = this.buildRequestsGroups(groupsIdsToDelete, allExistingUsersGroups, "delete");

        return Future.sequential([...$requestsToAdd, ...$requestsToDelete]).map(stats => {
            return Stats.combine(stats);
        });
    }

    private buildRequestsGroups(
        groups: Array<{ id: Id }>,
        allUsersGroups: D2UserGroupByKey,
        action: D2ActionGroup
    ): FutureData<Stats>[] {
        return _(groups)
            .map(group => {
                const users = allUsersGroups[group.id] || [];
                if (users.length === 0) return undefined;
                const userGroup = { id: group.id, users: users.map(({ id }) => ({ id })) };
                return this.buildGroupsToSave(userGroup, action);
            })
            .compact()
            .value();
    }

    private buildUsersByGroupId(users: ApiUser[]): D2UserGroupByKey {
        return _(users)
            .flatMap(user =>
                user.userGroups.map(group => ({
                    groupId: group.id,
                    user: user,
                }))
            )
            .groupBy(x => x.groupId)
            .mapValues(groupUsers => groupUsers.map(groupUser => groupUser.user))
            .value();
    }

    private buildGroupsToSave(
        userGroup: { id: Id; users: Array<{ id: Id }> },
        action: D2ActionGroup
    ): FutureData<Stats> {
        const isAdding = action === "add";
        const usersIds = userGroup.users.map(({ id }) => ({ id: id }));
        return apiToFuture(
            this.api.request<Dhis2Response>({
                method: "post",
                url: `/userGroups/${userGroup.id}/users`,
                data: isAdding ? { additions: usersIds } : { deletions: usersIds },
            })
        ).flatMap(d2Response => {
            const response = d2Response.response ? d2Response.response : d2Response;
            const errorMessage = getErrorFromResponse(response.typeReports);
            if (response.status === "ERROR") return Future.error(errorMessage);
            return Future.success(
                new Stats({
                    created: response.stats.created,
                    updated: response.stats.updated,
                    ignored: response.stats.ignored,
                    deleted: response.stats.deleted,
                    errorMessage: errorMessage,
                })
            );
        });
    }

    private toDomainUser(input: ApiUserWithAudit): User {
        const { userCredentials, ...user } = input;
        const authorities = _(userCredentials.userRoles)
            .map(userRole => userRole.authorities)
            .flatten()
            .uniq()
            .value();

        return {
            id: user.id,
            name: user.name,
            firstName: user.firstName,
            surname: user.surname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            whatsApp: user.whatsApp,
            facebookMessenger: user.facebookMessenger,
            skype: user.skype,
            telegram: user.telegram,
            twitter: user.twitter,
            lastUpdated: new Date(user.lastUpdated),
            created: new Date(user.created),
            userGroups: user.userGroups,
            username: userCredentials.username,
            apiUrl: `${this.api.baseUrl}/api/users/${user.id}.json`,
            userRoles: userCredentials.userRoles?.map(userRole => ({ id: userRole.id, name: userRole.name })) || [],
            lastLogin: userCredentials.lastLogin ? new Date(userCredentials.lastLogin) : undefined,
            status: userCredentials.disabled ? "Disabled" : "Active",
            disabled: userCredentials.disabled,
            organisationUnits: this.getDomainOrgUnits(user.organisationUnits),
            dataViewOrganisationUnits: this.getDomainOrgUnits(user.dataViewOrganisationUnits),
            searchOrganisationsUnits: this.getDomainOrgUnits(user.teiSearchOrganisationUnits),
            access: user.access,
            openId: userCredentials.openId,
            ldapId: userCredentials.ldapId,
            externalAuth: userCredentials.externalAuth,
            password: userCredentials.password,
            accountExpiry: userCredentials.accountExpiry,
            authorities,
            dbLocale: "",
            uiLocale: "",
            ...this.getUserAuditFields(input),
        };
    }

    private getUserAuditFields(user: ApiUserWithAudit): Pick<User, "createdBy" | "lastModifiedBy"> {
        const createdBy = user.userCredentials.createdBy || user.createdBy;
        const lastUpdatedBy = user.userCredentials.lastUpdatedBy || user.lastUpdatedBy;
        return {
            createdBy: createdBy ? { id: createdBy.id, username: createdBy.displayName } : undefined,
            lastModifiedBy: lastUpdatedBy ? { id: lastUpdatedBy?.id, username: lastUpdatedBy?.displayName } : undefined,
        };
    }

    private toApiUser(input: User): ApiUserWithAudit {
        return {
            id: input.id,
            name: input.name,
            firstName: input.firstName,
            surname: input.surname,
            email: input.email,
            phoneNumber: input.phoneNumber,
            whatsApp: input.whatsApp,
            facebookMessenger: input.facebookMessenger,
            skype: input.skype,
            telegram: input.telegram,
            twitter: input.twitter,
            lastUpdated: input.lastUpdated.toISOString(),
            created: input.created.toISOString(),
            userGroups: input.userGroups,
            organisationUnits: this.getApiOrgUnits(input.organisationUnits),
            dataViewOrganisationUnits: this.getApiOrgUnits(input.dataViewOrganisationUnits),
            teiSearchOrganisationUnits: this.getApiOrgUnits(input.searchOrganisationsUnits),
            access: input.access,
            userCredentials: {
                id: input.id,
                username: input.username,
                userRoles: input.userRoles.map(userRole => ({ id: userRole.id, name: userRole.name, authorities: [] })),
                lastLogin: input.lastLogin?.toISOString() ?? "",
                disabled: input.disabled,
                openId: input.openId ?? "",
                ldapId: input.ldapId ?? "",
                externalAuth: input.externalAuth ?? "",
                password: input.password ?? "",
                accountExpiry: input.accountExpiry ?? "",
                ...this.getApiAuditFields(input),
            },
            ...this.getApiAuditFields(input),
        };
    }

    private getApiAuditFields(user: User): D2UserAudit {
        return {
            createdBy: user.createdBy ? { id: user.createdBy.id, displayName: user.createdBy.username } : undefined,
            lastUpdatedBy: user.lastModifiedBy
                ? {
                      id: user.lastModifiedBy.id,
                      displayName: user.lastModifiedBy.username,
                  }
                : undefined,
        };
    }

    private getDomainOrgUnits(d2OrgUnits: ApiD2OrgUnit[]): OrgUnit[] {
        return d2OrgUnits.map(d2OrgUnit => ({
            ...d2OrgUnit,
            path: d2OrgUnit.path.split("/").slice(1),
        }));
    }

    private getApiOrgUnits(orgUnits: OrgUnit[]): ApiD2OrgUnit[] {
        return orgUnits.map(orgUnit => ({ ...orgUnit, path: joinPaths(orgUnit) }));
    }
}

const orgUnitsFields = { id: true, name: true, code: true, path: true } as const;

const auditFields = {
    createdBy: { id: true, displayName: true },
    lastUpdatedBy: { id: true, displayName: true },
};

const fields = {
    id: true,
    name: true,
    firstName: true,
    surname: true,
    email: true,
    phoneNumber: true,
    whatsApp: true,
    facebookMessenger: true,
    skype: true,
    telegram: true,
    twitter: true,
    lastUpdated: true,
    created: true,
    userGroups: { id: true, name: true },
    organisationUnits: orgUnitsFields,
    dataViewOrganisationUnits: orgUnitsFields,
    teiSearchOrganisationUnits: orgUnitsFields,
    access: true,
    userCredentials: {
        id: true,
        username: true,
        userRoles: { id: true, name: true, authorities: true },
        lastLogin: true,
        disabled: true,
        openId: true,
        ldapId: true,
        externalAuth: true,
        password: true,
        accountExpiry: true,
    },
} as const;

export type ApiUser = SelectedPick<D2UserSchema, typeof fields>;
export type ApiUserWithAudit = ApiUser & { userCredentials: ApiUser["userCredentials"] & D2UserAudit } & D2UserAudit;

const defaultColumns: Array<keyof User> = [
    "username",
    "firstName",
    "surname",
    "email",
    "organisationUnits",
    "lastLogin",
    "disabled",
];

// in version 2.38 stats and typeReports are inside a response object
type Dhis2Response = MetadataResponse & {
    response?: {
        status: MetadataResponse["status"];
        stats: MetadataResponse["stats"];
        typeReports: MetadataResponse["typeReports"];
    };
};

type D2UserAudit = {
    createdBy?: { id: string; displayName: string };
    lastUpdatedBy?: { id: string; displayName: string };
};

type D2UserSettings = { keyDbLocale: LocaleCode; keyUiLocale: LocaleCode };
type KeyLocale = "keyUiLocale" | "keyDbLocale";
const UI_LOCALE_KEY = "keyUiLocale";
const DB_LOCALE_KEY = "keyDbLocale";
type D2UserGroupByKey = Record<Id, NamedRef[]>;
type D2ActionGroup = "add" | "delete";
