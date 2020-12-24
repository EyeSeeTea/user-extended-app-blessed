import _ from "lodash";
import { getOwnedPropertyJSON } from "d2/lib/model/helpers/json";
const toArray = obj => (obj.toArray ? obj.toArray() : obj || []);
import { getExistingUsers } from "../../models/userHelpers";

export default class CopyInUserBatchModelsMultiSelectModel {
    constructor(
        d2,
        { parentModel, parentFields, getPayload, childrenModel, childrenFields, getChildren }
    ) {
        Object.assign(this, {
            d2,
            parentModel: parentModel,
            parentFields: parentFields || ":owner",
            childrenModel: childrenModel,
            getChildren: parent => toArray(getChildren(parent)),
            childrenFields: childrenFields || "id,name",
            getPayload,
        });
    }

    getAllChildren() {
        return this.childrenModel
            .list({ fields: this.childrenFields, paging: false })
            .then(collection =>
                _(collection.toArray())
                    .sortBy("name")
                    .value()
            );
    }

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
        const users  = await getExistingUsers(d2, {
            fields: ":owner,userGroups[id]",
            filter: "id:in:[" + ids.join(",") + "]",
        });
        return users;
    }

    //I don't need to change anything here, just pass in the 2 booleans 
    async copyInUserSave(parents, selectedIds, copyUserGroups, copyUserRoles) {
        //with this way, I get both the userRoles AND userGroups so maybe I'll just do this to begin with
        //then I pass this to the payload and then depending on the booleans I can copy userRoles and/or userGroups
        const parentWithRoles = await this.getUserInfo([getOwnedPropertyJSON(parents[0]).id]);
        const childrenUsers = await this.getUserInfo(selectedIds);
        console.log('parent')
        console.log(parentWithRoles)
        console.log('children')
        console.log(childrenUsers)
        const payload = await this.getPayload(...parentWithRoles, childrenUsers, copyUserGroups, copyUserRoles);
        return payload;
    }

    getSelectedChildren(parents) {
        const commonChildren = _.intersectionBy(...parents.map(this.getChildren), "id");
        return _(commonChildren)
            .sortBy(obj => obj.name)
            .value();
    }

    
}
