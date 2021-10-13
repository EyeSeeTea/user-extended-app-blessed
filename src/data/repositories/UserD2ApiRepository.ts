import _ from "lodash";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { Future, FutureData } from "../../domain/entities/Future";
import { PaginatedResponse } from "../../domain/entities/PaginatedResponse";
import { User } from "../../domain/entities/User";
import { UserRepository, ListOptions } from "../../domain/repositories/UserRepository";
import { cache } from "../../utils/cache";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { Instance } from "../entities/Instance";

export class UserD2ApiRepository implements UserRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    @cache()
    public getCurrent(): FutureData<User> {
        return apiToFuture(this.api.currentUser.get({ fields })).map(user => ({
            id: user.id,
            name: user.displayName,
            firstName: user.firstName,
            surname: user.surname,
            email: user.email,
            lastUpdated: new Date(user.lastUpdated),
            created: new Date(user.created),
            userGroups: user.userGroups,
            username: user.userCredentials.username,
            userRoles: user.userCredentials.userRoles,
            lastLogin: new Date(user.userCredentials.lastLogin),
            disabled: user.userCredentials.disabled,
            organisationUnits: user.organisationUnits,
            dataViewOrganisationUnits: user.dataViewOrganisationUnits,
            access: user.access,
        }));
    }

    public list(options: ListOptions): FutureData<PaginatedResponse<User>> {
        const { page, pageSize, search, sorting = { field: "firstName", order: "asc" }, filters } = options;
        let filterObj: FilterObject = {};
        if (filters !== undefined) {
            filterObj = _.mapValues(filters, (items, key) => {
                if (key === "userCredentials.disabled") {
                    return items !== undefined ? { eq: items[1] } : undefined;
                } else {
                    return items !== null ? { in: items[1] } : undefined;
                }
            });
        }

        return apiToFuture(
            this.api.models.users.get({
                fields,
                page,
                pageSize,
                paging: true,
                filter: {
                    identifiable: search ? { token: search } : undefined,
                    ...filterObj,
                },
                order: `${sorting.field}:${sorting.order}`,
            })
        ).map(({ objects, pager }) => ({
            pager,
            objects: objects.map(user => ({
                id: user.id,
                name: user.displayName,
                firstName: user.firstName,
                surname: user.surname,
                email: user.email,
                lastUpdated: new Date(user.lastUpdated),
                created: new Date(user.created),
                userGroups: user.userGroups,
                username: user.userCredentials.username,
                userRoles: user.userCredentials.userRoles,
                lastLogin: new Date(user.userCredentials.lastLogin),
                disabled: user.userCredentials.disabled,
                organisationUnits: user.organisationUnits,
                dataViewOrganisationUnits: user.dataViewOrganisationUnits,
                access: user.access,
            })),
        }));
    }

    public getById(id: string): FutureData<User> {
        return apiToFuture(this.api.models.users.get({ fields, filter: { id: { eq: id } } })).flatMap(
            ({ objects: [user] }) => {
                if (!user) return Future.error(`User ${id} not found`);

                return Future.success({
                    id: user.id,
                    name: user.displayName,
                    firstName: user.firstName,
                    surname: user.surname,
                    email: user.email,
                    lastUpdated: new Date(user.lastUpdated),
                    created: new Date(user.created),
                    userGroups: user.userGroups,
                    username: user.userCredentials.username,
                    userRoles: user.userCredentials.userRoles,
                    lastLogin: new Date(user.userCredentials.lastLogin),
                    disabled: user.userCredentials.disabled,
                    organisationUnits: user.organisationUnits,
                    dataViewOrganisationUnits: user.dataViewOrganisationUnits,
                    access: user.access,
                });
            }
        );
    }
}

type FilterObject = Record<string, undefined | null | { eq?: any; in?: undefined }>;

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
    },
    organisationUnits: { id: true, name: true },
    dataViewOrganisationUnits: { id: true, name: true },
    access: true,
};
