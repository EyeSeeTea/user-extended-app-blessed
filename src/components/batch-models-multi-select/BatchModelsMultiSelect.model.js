import _ from "lodash";
const toArray = obj => (obj.toArray ? obj.toArray() : obj || []);

export default class BatchModelsMultiSelectModel {
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
    async save(parents, allChildren, selectedIds, updateStrategy) {
        const api = this.d2.Api.getApi();
        const selectedChildren = _(allChildren)
            .keyBy("id")
            .at(...selectedIds)
            .compact()
            .value();

        const childrenForParents = this.getNewChildren(parents, selectedChildren, updateStrategy);
        const payload = this.getPayload(allChildren, _.zip(parents, childrenForParents));
        const metadataUrl = "metadata?importStrategy=UPDATE&mergeMode=REPLACE";
        return api.post(metadataUrl, payload).then(response => {
            if (response.status !== "OK") {
                console.error("Response error", response);
                throw new Error(response.status);
            } else {
                return response;
            }
        });
    }

    getSelectedChildren(parents) {
        const commonChildren = _.intersectionBy(...parents.map(this.getChildren), "id");
        return _(commonChildren)
            .sortBy(obj => obj.name)
            .value();
    }

    getNewChildren(parents, newChildren, updateStrategy) {
        const childrenAssignedToAllParents = this.getSelectedChildren(parents);
        const getNewChildrenForParent = parent => {
            switch (updateStrategy) {
                case "merge":
                    const childrenToRemove = _.differenceBy(
                        childrenAssignedToAllParents,
                        newChildren,
                        "id"
                    );
                    const childrenToAdd = _.differenceBy(
                        newChildren,
                        childrenAssignedToAllParents,
                        "id"
                    );
                    return _(this.getChildren(parent))
                        .differenceBy(childrenToRemove, "id")
                        .concat(childrenToAdd)
                        .value();
                case "replace":
                    return newChildren;
                default:
                    throw new Error("Unknown strategy: " + strategy);
            }
        };
        return parents.map(getNewChildrenForParent);
    }
}
