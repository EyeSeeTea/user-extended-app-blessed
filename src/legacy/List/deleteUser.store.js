import Store from "d2-ui/lib/store/Store";
import { getInstance as getD2 } from "d2/lib/d2";

import snackActions from "../Snackbar/snack.actions";
import _m from "../utils/lodash-mixins";

export default Store.create({
    async delete(users) {
        const d2 = await getD2();
        const t = d2.i18n.getTranslation.bind(d2.i18n);
        const api = d2.Api.getApi();
        const usersText = _m.joinString(
            t,
            users.map(user => user.userCredentials.username),
            3,
            ", "
        );
        const payload = { users };
        return api
            .post(`metadata?importStrategy=DELETE`, payload)
            .then(response => {
                snackActions.show({ message: t("users_deleted", { users: usersText }) });
                this.setState(response);
            })
            .catch(response => {
                snackActions.show({ message: response.message || "Error" });
            });
    },
});
