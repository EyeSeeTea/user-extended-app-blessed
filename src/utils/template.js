export const getFromTemplate = (template, count) => {
    if (count && count > 0) {
        return _(count).times(index => template.replace("$index", index + 1));
    } else {
        return [];
    }
};
