import _ from 'lodash';

function getCompactTextForModels(d2, models, { limit }) {
    const t = d2.i18n.getTranslation.bind(d2.i18n);

    if (!models) {
        return "";
    } else if (models.length <= limit) {
        return _(models).map("displayName").join(', ');
    } else {
        return t("this_and_n_others_compact", {
            "this": _(models).take(limit).map("displayName").join(", "),
            "n": models.length - limit,
        });
    }
}

export { getCompactTextForModels };
