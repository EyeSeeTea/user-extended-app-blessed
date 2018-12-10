import _ from 'lodash';

function getCompactTextForModels(d2, models, { limit, field, i18nKey }) {
    const t = d2.i18n.getTranslation.bind(d2.i18n);
    const modelField = field || "displayName";

    if (!models) {
        return "";
    } else if (models.length <= limit) {
        return _(models).map(modelField).join(', ');
    } else {
        return t(i18nKey || "this_and_n_others_compact", {
            "this": _(models).take(limit).map(modelField).join(", "),
            "n": models.length - limit,
        });
    }
}

export { getCompactTextForModels };
