import i18n from "@eyeseetea/d2-ui-components/locales";
import _ from "lodash";

export function ellipsizedList(items: string[], limit = 3): string {
    const overflow = items.length - limit;
    const hasOverflow = overflow > 0;
    
    return _.take(items, limit).join(", ") + (hasOverflow ? i18n.t(" and {{overflow}} more...", { overflow }) : "");
}
