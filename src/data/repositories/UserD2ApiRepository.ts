import { D2Api, D2UserSchema, SelectedPick } from "@eyeseetea/d2-api/2.34";
import _ from "lodash";
import { Future, FutureData } from "../../domain/entities/Future";
import { PaginatedResponse } from "../../domain/entities/PaginatedResponse";
import { User } from "../../domain/entities/User";
import { ListOptions, UserRepository } from "../../domain/repositories/UserRepository";
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
                paging: true,
                filter: {
                    identifiable: search ? { token: search } : undefined,
                    ...otherFilters,
                },
                order: `${sorting.field}:${sorting.order}`,
            })
        ).map(({ objects, pager }) => ({
            pager,
            objects: objects.map(user => this.mapUser(user)),
        }));
    }

    public getById(id: string): FutureData<User> {
        return apiToFuture(this.api.models.users.get({ fields, filter: { id: { eq: id } } })).flatMap(({ objects }) => {
            const [user] = objects;
            if (!user) return Future.error(`User ${id} not found`);

            return Future.success(this.mapUser(user));
        });
    }

    private mapUser(user: D2ApiUser): User {
        const lastLogin = user.userCredentials.lastLogin;

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
            userRoles: user.userCredentials.userRoles,
            lastLogin: lastLogin === undefined ? "N/A" : new Date(lastLogin),
            disabled: user.userCredentials.disabled,
            organisationUnits: user.organisationUnits,
            dataViewOrganisationUnits: user.dataViewOrganisationUnits,
            access: user.access,
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
    },
    organisationUnits: { id: true, name: true },
    dataViewOrganisationUnits: { id: true, name: true },
    access: true,
} as const;

type D2ApiUser = SelectedPick<D2UserSchema, typeof fields>;
