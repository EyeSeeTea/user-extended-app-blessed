import _ from "lodash";
import fp from "lodash/fp";

function imerge(obj1, obj2) {
    return _.assign({}, obj1, obj2);
}

function deepMerge(object, source) {
    return _.mergeWith(object, source, function (objValue, srcValue) {
        if (_.isObject(objValue) && srcValue) {
            return deepMerge(objValue, srcValue);
        }
    });
}

function cartesianProduct(...rest) {
    return fp.reduce((a, b) => fp.flatMap(x => fp.map(y => x.concat([y]))(b))(a))([[]])(rest);
}

function groupConsecutiveBy(xs, mapper = _.identity) {
    const reducer = (acc, x) => {
        if (_.isEmpty(acc)) {
            return acc.concat([[x]]);
        } else {
            const last = _.last(acc);
            if (_.isEqual(mapper(_.last(last)), mapper(x))) {
                last.push(x);
                return acc;
            } else {
                return acc.concat([[x]]);
            }
        }
    };

    return _(xs).reduce(reducer, []);
}

function transpose(xss) {
    return _.zip(...xss);
}

function groupByKeys(objs, keys, thruFn = _.identity) {
    if (_(keys).isEmpty()) {
        return objs;
    } else {
        return _(objs)
            .groupBy(keys[0])
            .map((vs, k) => [k, _.groupByKeys(vs, keys.slice(1), thruFn)])
            .fromPairs()
            .thru(thruFn)
            .value();
    }
}

function joinString(getTranslation, strings, maxItems, joinString) {
    const base = _(strings).take(maxItems).join(joinString);
    return strings.length <= maxItems
        ? base
        : getTranslation("this_and_n_others", { this: base, n: strings.length - maxItems });
}

/* Accumulate consecutive elements in groups as long as the group satisfies a predicate.
   Throw an error if an item cannot be added to an empty group.

Example:

  > _.chunkWhile([9, 6, 3, 2, 6, 3, 2, 3], xs => _.sum(xs) < 10);
  [ [ 9 ], [ 6, 3 ], [ 2, 6 ], [ 3, 2, 3 ] ]
*/
function chunkWhile(xs, predicate) {
    let output = [];
    let currentGroup = [];

    xs.forEach(x => {
        const potentialNewCurrentGroup = currentGroup.concat([x]);

        if (predicate(potentialNewCurrentGroup)) {
            currentGroup = potentialNewCurrentGroup;
        } else if (currentGroup.length === 0) {
            throw new Error(`[chunkWhile] Item does not satisfy predicate: ${x}`);
        } else {
            output.push(currentGroup);
            currentGroup = [x];
        }
    });

    if (currentGroup.length > 0) output.push(currentGroup);

    return output;
}

_.mixin({
    imerge,
    deepMerge,
    cartesianProduct,
    groupConsecutiveBy,
    transpose,
    groupByKeys,
    joinString,
    chunkWhile,
});

export default _;
