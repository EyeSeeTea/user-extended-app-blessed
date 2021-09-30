import _ from "lodash";

const error = errorKey => ({ isValid: false, error: errorKey });
const valid = () => ({ isValid: true });

/* Return { isValid: true } if password is valid, { isValid: false, error: "some_key"} otherwise */
export const validatePassword = (password, { allowEmpty = false } = {}) => {
    // See https://github.com/dhis2/user-app/blob/master/src/utils/checkPasswordForErrors.js
    const lowerCase = /^(?=.*[a-z]).+$/;
    const upperCase = /^(?=.*[A-Z]).+$/;
    const digit = /^(?=.*[0-9]).+$/;
    const specialChar = /[`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/;

    if (allowEmpty && password === "") {
        return valid();
    } else if (!password) {
        return error("is_required");
    } else if (password.length < 8) {
        return error("at_least_8_chars_long");
    } else if (password.length > 35) {
        return error("no_longer_than_35_chars");
    } else if (!lowerCase.test(password)) {
        return error("at_least_one_lowercase_letter");
    } else if (!upperCase.test(password)) {
        return error("at_least_one_uppercase_letter");
    } else if (!digit.test(password)) {
        return error("at_least_one_number");
    } else if (!specialChar.test(password)) {
        return error("at_least_one_special_char");
    } else {
        return valid();
    }
};

/* Return { isValid: true } if username is valid, { isValid: false, error: "some_key"} otherwise */
export const validateUsername = (existingUsernames, usedUsernames, username) => {
    if (!username) {
        return error("is_required");
    } else if (username.length < 2) {
        return error("at_least_2_chars_long");
    } else if (username.length > 140) {
        return error("no_longer_than_140_chars");
    } else if (existingUsernames.has(username)) {
        return error("already_exists");
    } else if (usedUsernames.has(username)) {
        return error("duplicated");
    } else {
        return valid();
    }
};

/* Helpers */

/* Transform validators of this module to the format required by d2-ui component FormBuilder */
export const toBuilderValidator = (customValidator, getErrorMessage) => {
    return {
        validator: (value, ...args) => {
            const result = customValidator(value, ...args);
            if (result.isValid) {
                return true;
            } else {
                //eslint-disable-next-line
                const errorValue = result.hasOwnProperty("value") ? result.value : value;
                return getErrorMessage(errorValue, result.error);
            }
        },
    };
};

/* Validate a collection of values against a validator, return first invalid validation */
export const validateValues = (values, validator) => {
    const firstInvalidResult = _(values)
        .map(value => ({ ...validator(value), value }))
        .find(result => !result.isValid);
    return firstInvalidResult || { isValid: true };
};
