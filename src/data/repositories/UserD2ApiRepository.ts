import { D2Api, D2UserSchema, MetadataResponse, SelectedPick } from "@eyeseetea/d2-api/2.36";
import _ from "lodash";
import { Future, FutureData } from "../../domain/entities/Future";
import { PaginatedResponse } from "../../domain/entities/PaginatedResponse";
import { Id, NamedRef } from "../../domain/entities/Ref";
import { Stats } from "../../domain/entities/Stats";
import { DB_LOCALE_KEY, LocaleCode, UI_LOCALE_KEY, User } from "../../domain/entities/User";
import { ListOptions, UpdateStrategy, UserRepository } from "../../domain/repositories/UserRepository";
import { cache } from "../../utils/cache";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { DataStoreStorageClient } from "../clients/storage/DataStoreStorageClient";
import { Namespaces } from "../clients/storage/Namespaces";
import { StorageClient } from "../clients/storage/StorageClient";
import { Instance } from "../entities/Instance";
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
            default:
                throw Error(`Invalid locale type: ${keyLocale}`);
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

        return apiToFuture(
            this.api.models.users.get({
                fields: {
                    ...fields,
                    createdBy: { displayName: true },
                    lastUpdatedBy: { displayName: true },
                },
                page,
                pageSize,
                query: search !== "" ? search : undefined,
                canManage: canManage === "true" ? "true" : undefined,
                filter: otherFilters,
                rootJunction: areFiltersEnabled ? rootJunction : undefined,
                order: `${sorting.field}:${sorting.order}`,
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
        return this.getUsersByIds(ids);
    }

    private getUsersByIds(ids: Id[]): FutureData<User[]> {
        const $requests = Future.sequential(
            _.chunk(ids, 50).map(usersIds => {
                return apiToFuture(
                    this.api.models.users.get({ paging: false, fields, filter: { id: { in: usersIds } } })
                ).flatMap(({ objects }) => {
                    const users = objects.map(user => this.toDomainUser(user));
                    return this.getLocales(users).flatMap(users => Future.success(users));
                });
            })
        );

        return Future.sequential([$requests]).map(result => {
            return _(result[0]).flatten().value();
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
                const usersToSend = _(existingUsers)
                    .map(existingUser => {
                        const user = users.find(user => user.id === existingUser.id);
                        if (!user) return undefined;
                        return {
                            ...existingUser,
                            organisationUnits: user?.organisationUnits,
                            dataViewOrganisationUnits: user?.dataViewOrganisationUnits,
                            email: user?.email,
                            firstName: user?.firstName,
                            surname: user?.surname,
                            phoneNumber: user?.phoneNumber,
                            whatsApp: user?.whatsApp,
                            facebookMessenger: user?.facebookMessenger,
                            skype: user?.skype,
                            telegram: user?.telegram,
                            twitter: user?.twitter,
                            userRoles: user?.userCredentials.userRoles,
                            username: user?.userCredentials.username,
                            disabled: user?.userCredentials.disabled,
                            openId: user?.userCredentials.openId,
                            password: user?.userCredentials.password,
                            userCredentials: {
                                ...existingUser.userCredentials,
                                disabled: user?.userCredentials.disabled,
                                userRoles: user?.userCredentials.userRoles,
                                username: user?.userCredentials.username,
                                openId: user?.userCredentials.openId,
                                ldapId: user?.userCredentials.ldapId,
                                externalAuth: user?.userCredentials.externalAuth,
                                password: user?.userCredentials.password,
                                accountExpiry: user?.userCredentials.accountExpiry,
                            },
                        };
                    })
                    .compact()
                    .value();

                return apiToFuture(this.api.metadata.post({ users: usersToSend, userGroups })).flatMap(data => {
                    return this.saveLocales(usersToSave).map(() => data);
                });
            });
        });
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
            disabled: userCredentials.disabled,
            organisationUnits: user.organisationUnits,
            dataViewOrganisationUnits: user.dataViewOrganisationUnits,
            access: user.access,
            openId: userCredentials.openId,
            ldapId: userCredentials.ldapId,
            externalAuth: userCredentials.externalAuth,
            password: userCredentials.password,
            accountExpiry: userCredentials.accountExpiry,
            authorities,
            createdBy: user.createdBy ? user.createdBy.displayName : "",
            lastModifiedBy: user.lastUpdatedBy ? user.lastUpdatedBy.displayName : "",
            dbLocale: "",
            uiLocale: "",
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
            organisationUnits: input.organisationUnits,
            dataViewOrganisationUnits: input.dataViewOrganisationUnits,
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
            },
            createdBy: { displayName: input.createdBy },
            lastUpdatedBy: { displayName: input.lastModifiedBy },
        };
    }
}

const orgUnitsFields = { id: true, name: true, path: true } as const;

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
export type ApiUserWithAudit = ApiUser & UserAudit;

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
    response?: { stats: MetadataResponse["stats"]; typeReports: MetadataResponse["typeReports"] };
};

type UserAudit = {
    createdBy?: { displayName: string };
    lastUpdatedBy?: { displayName: string };
};

type D2UserSettings = { keyDbLocale: LocaleCode; keyUiLocale: LocaleCode };
type KeyLocale = "keyUiLocale" | "keyDbLocale";
