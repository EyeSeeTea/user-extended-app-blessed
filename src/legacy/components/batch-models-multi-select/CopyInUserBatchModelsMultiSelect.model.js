import _ from "lodash";
import { getOwnedPropertyJSON } from "d2/lib/model/helpers/json";
import { getExistingUsers } from "../../models/userHelpers";
const toArray = obj => (obj.toArray ? obj.toArray() : obj || []);

export default class CopyInUserBatchModelsMultiSelectModel {
    constructor(d2, { parentModel, getPayload, parentFields, childrenModel, childrenFields, getChildren }) {
        Object.assign(this, {
            d2,
            parentModel: parentModel,
            parentFields: parentFields || ":owner",
            childrenModel: childrenModel,
            getChildren: parent => toArray(getChildren(parent)),
            childrenFields: childrenFields || "id,name,userCredentials[username]",
            getPayload,
        });
    }

    getAllChildren = () => {
        return this.childrenModel
            .list({ fields: this.childrenFields, paging: false })
            .then(collection => _(collection.toArray()).sortBy("name").value());
    };

    getParents(parents) {
        const parentIds = _(parents)
            .map(obj => obj.id)
            .compact()
            .value();
        const options = {
            paging: false,
            filter: "id:in:[" + parentIds.join(",") + "]",
            fields: this.parentFields || ":owner",
        };
        return this.parentModel.list(options).then(collection => collection.toArray());
    }
    async getUserInfo(ids) {
        const users = await getExistingUsers(this.d2, {
            fields: ":owner,userGroups[id]",
            filter: "id:in:[" + ids.join(",") + "]",
        });
        return users;
    }
    async copyInUserSave(parents, selectedIds, copyAccessElements, updateStrategy) {
        const parentWithRoles = await this.getUserInfo([getOwnedPropertyJSON(parents[0]).id]);
        const childrenUsers = await this.getUserInfo(selectedIds);

        const payload = await this.getPayload(
            this.d2,
            ...parentWithRoles,
            childrenUsers,
            copyAccessElements,
            updateStrategy
        );
        return payload;
    }

    getSelectedChildren(parents) {
        const commonChildren = _.intersectionBy(...parents.map(this.getChildren), "id");
        return _(commonChildren)
            .sortBy(obj => obj.name)
            .value();
    }
}
