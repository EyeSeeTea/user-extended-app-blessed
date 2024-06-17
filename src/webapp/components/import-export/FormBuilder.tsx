import CircularProgress from "material-ui/CircularProgress";
import React, { useEffect, useCallback } from "react";
import AsyncValidatorRunner from "../../../legacy/components/AsyncValidatorRunner";

export const FormBuilder: React.FC<FormBuilderProps> = props => {
    const {
        id = null,
        validatingLabelText = "Validating...",
        validatingProgressStyle = { position: "absolute", right: -12, top: 16 },
        onUpdateFormStatus = () => {},
        validateOnRender = false,
        validateOnInitialRender = false,
        validateFullFormOnChanges = false,
        fields: propsFields,
        onUpdateField,
        style,
        fieldWrapStyle,
        fieldWrapper: FieldWrapperComponent = "div",
        mainWrapper: MainWrapperComponent = "div",
        asyncValidationRunner = new AsyncValidatorRunner(),
    } = props;

    const [fields, setFields] = React.useState<Fields>();
    const [form, setForm] = React.useState<Form>();

    const createAsyncValidators = (fieldsProps: FieldsProp[], asyncValidators: AsyncValidator) => {
        return fieldsProps
            .filter(field => Array.isArray(field.asyncValidators) && field.asyncValidators.length)
            .reduce((acc: AsyncValidator, currentField) => {
                acc[currentField.name] = asyncValidators[currentField.name] || undefined;
                return acc;
            }, {});
    };

    const [asyncValidators, setAsyncValidators] = React.useState<Record<string, any>>(
        createAsyncValidators(propsFields, {})
    );

    /**
     * Retreive the field that has the specified field name
     */
    const getFieldProp = useCallback(
        (fieldName: keyof Fields): FieldsProp => {
            const field = propsFields.find(f => f.name === fieldName);
            if (!field) {
                throw new Error(`Field with name ${fieldName} not found`);
            }
            return field;
        },
        [propsFields]
    );

    /**
     * Retreive the state clone of the form and fields
     */
    const getFieldsAndForm = useCallback(
        fieldsProps => {
            const newFields = fieldsProps.reduce((accFields: Fields, field: Field & { name: keyof Fields }) => {
                // const currentFieldState = this.state && this.state.fields && this.state.fields[field.name];
                const currentFieldState = fields && fields[field.name];
                return Object.assign(accFields, {
                    [field.name]: {
                        value:
                            currentFieldState !== undefined && !currentFieldState.pristine
                                ? currentFieldState.value
                                : field.value,
                        pristine: currentFieldState !== undefined ? currentFieldState.value === field.value : true,
                        validating: currentFieldState !== undefined ? currentFieldState.validating : false,
                        valid: currentFieldState !== undefined ? currentFieldState.valid : true,
                        error: currentFieldState && currentFieldState.error,
                    },
                });
            }, {});
            const emptyForm = {
                pristine: true,
                validating: false,
                valid: true,
            };
            const newForm = fields
                ? {
                      pristine: Object.keys(fields).reduce((p, c) => p && fields[c as keyof Fields].pristine, true),
                      validating: Object.keys(fields).reduce(
                          (p, c) => p || fields[c as keyof Fields].validating,
                          false
                      ),
                      valid: Object.keys(fields).reduce((p, c) => p && fields[c as keyof Fields].valid, true),
                  }
                : emptyForm;
            return { newFields, newForm };
        },
        [fields]
    );

    React.useEffect(() => {
        const { newFields, newForm } = getFieldsAndForm(propsFields);
        setFields(newFields);
        setForm(newForm);
        validateField({ fields: newFields, form: newForm }, "username", newFields["username"].value);
    }, [propsFields]);

    /**
     * Utility method to mutate the provided state object in place
     */
    const updateFieldState = useCallback(
        (state: { fields: any; form: any }, fieldName: keyof Fields, fieldState: any) => {
            const fieldProp = getFieldProp(fieldName);
            state.fields[fieldName] = {
                pristine:
                    fieldState.pristine !== undefined
                        ? !!fieldState.pristine
                        : state.fields[fieldName].value === fieldProp.value,
                validating:
                    fieldState.validating !== undefined ? !!fieldState.validating : state.fields[fieldName].validating,
                valid: fieldState.valid !== undefined ? !!fieldState.valid : state.fields[fieldName].valid,
                error: fieldState.error,
                value: fieldState.value !== undefined ? fieldState.value : state.fields[fieldName].value,
            };

            // Form state is a composite of field states
            const fieldNames = Object.keys(state.fields);
            state.form = {
                pristine: fieldNames.reduce((p, current) => {
                    return p && state.fields[current].pristine;
                }, true),
                validating: fieldNames.reduce((p, current) => {
                    return p || state.fields[current].validating;
                }, false),
                valid: fieldNames.reduce((p, current) => {
                    return p && state.fields[current].valid;
                }, true),
            };

            return state;
        },
        [getFieldProp]
    );

    /**
     * Run all synchronous validators (if any) for the field and value, and update the state clone depending on the
     * outcome
     */
    const validateField = useCallback(
        (stateClone: { fields: any; form: any }, fieldName: keyof Fields, newValue: string) => {
            const field = getFieldProp(fieldName);

            const validatorResult = (field.validators || []).reduce((pass: boolean, currentValidator: any) => {
                if (pass !== true) {
                    return pass;
                } else {
                    const validatorResult = currentValidator.validator(newValue, id);
                    return validatorResult === true ? true : currentValidator.message || validatorResult;
                }
            }, true);

            updateFieldState(stateClone, fieldName, {
                valid: validatorResult === true,
                error: validatorResult === true ? undefined : validatorResult,
            });

            return validatorResult;
        },
        [getFieldProp, id, updateFieldState]
    );

    /**
     * Custom state deep copy function
     */
    const getStateClone = ({ fields, form }: { fields: Fields; form: Form }): { fields: Fields; form: Form } => {
        return {
            form: {
                pristine: form.pristine,
                valid: form.valid,
                validating: form.validating,
            },
            fields: Object.keys(fields).reduce((p, c) => {
                const key = c as keyof Fields;
                p[key] = {
                    pristine: fields[key].pristine,
                    validating: fields[key].validating,
                    valid: fields[key].valid,
                    value: fields[key].value,
                    error: fields[key].error,
                };
                return p;
            }, {} as { [key in keyof Fields]: Field }),
        };
    };

    /**
     * Called by React when the component receives new props, but not on the initial render.
     *
     * State is calculated based on the incoming props, in such a way that existing form fields
     * are updated as necessary, but not overridden. See the initState function for details.
     */
    const validateProps = useCallback(
        (propsFields, validateFullFormOnChanges, asyncValidators) => {
            setAsyncValidators(createAsyncValidators(propsFields, asyncValidators));
            if (!fields || !form) {
                return;
            }
            const clonedState = { form: { ...form }, fields: { ...fields } };

            propsFields
                // Only check fields that are set on the component state
                .filter((field: Field & { name: keyof Fields }) => fields && fields[field.name])
                // Filter out fields where the values changed
                .filter(
                    (field: Field & { name: keyof Fields }) =>
                        validateFullFormOnChanges || field.value !== fields[field.name].value
                )
                // Change field value and run validators for the field
                .forEach((field: Field & { name: keyof Fields }) => {
                    clonedState.fields[field.name].value = field.value;
                    validateField(clonedState, field.name, field.value);
                });

            onUpdateFormStatus(clonedState.form);
            setFields(clonedState.fields);
            setForm(clonedState.form);
        },
        [fields, form, onUpdateFormStatus]
    );

    useEffect(() => {
        if (validateOnRender || validateOnInitialRender) {
            validateProps(propsFields, validateFullFormOnChanges, asyncValidators);
        }
    }, [validateFullFormOnChanges, validateOnRender]);

    /**
     * Render the form fields.
     *
     * @returns {*} An array containing markup for each form field
     */
    const renderFields = useCallback(() => {
        const styles = {
            field: {
                position: "relative",
            },
            progress: validatingProgressStyle,
            validatingErrorStyle: {
                color: "orange",
            },
        };

        return propsFields.map(field => {
            const { errorTextProp, changeEvent, ...props } = field.props || {};
            const fieldState = fields && fields[field.name] ? fields[field.name] : undefined;

            const changeHandler = (e: Event) => handleFieldChange({ fields, form }, field.name, e);

            const onBlurChangeHandler =
                changeEvent === "onBlur"
                    ? (e: { target: { value: any } }) => {
                          if (!fields || !form) {
                              return;
                          }

                          const stateClone = updateFieldState(
                              { form: { ...form }, fields: { ...fields } },
                              field.name,
                              {
                                  value: e.target.value,
                              }
                          );
                          validateField(stateClone, field.name, e.target.value);
                          setFields(stateClone.fields);
                          setForm(stateClone.form);
                      }
                    : undefined;

            const errorText =
                fieldState && fieldState.validating ? field.validatingLabelText || validatingLabelText : errorTextProp;

            return (
                <FieldWrapperComponent key={field.name} style={Object.assign({}, styles.field, fieldWrapStyle)}>
                    {fieldState && fieldState.validating ? (
                        <CircularProgress mode="indeterminate" size={20} style={styles.progress} />
                    ) : undefined}
                    {fieldState ? (
                        <field.component
                            value={fieldState.value}
                            onChange={changeEvent && changeEvent === "onBlur" ? onBlurChangeHandler : changeHandler}
                            onBlur={changeEvent && changeEvent === "onBlur" ? changeHandler : undefined}
                            errorStyle={fieldState.validating ? styles.validatingErrorStyle : undefined}
                            errorText={fieldState.valid ? errorText : fieldState.error}
                            {...props}
                        />
                    ) : undefined}
                </FieldWrapperComponent>
            );
        });
    }, [
        FieldWrapperComponent,
        fieldWrapStyle,
        fields,
        form,
        propsFields,
        updateFieldState,
        validateField,
        validatingLabelText,
        validatingProgressStyle,
    ]);

    /**
     * Render the component
     *
     * @returns {XML}
     */
    const render = () => {
        return (
            <MainWrapperComponent id={id} style={style}>
                {renderFields()}
            </MainWrapperComponent>
        );
    };

    /**
     * Cancel the currently running async validators for the specified field name, if any.
     */
    const cancelAsyncValidators = (fieldName: keyof Fields) => {
        if (asyncValidators[fieldName]) {
            asyncValidators[fieldName].dispose();
            asyncValidators[fieldName] = undefined;
        }
    };

    /**
     * Field value change event
     *
     * This is called whenever the value of the specified field has changed. This will be the onChange event handler, unless
     * the changeEvent prop for this field is set to 'onBlur'.
     *
     * The change event is processed as follows:
     *
     * - If the value hasn't actually changed, processing stops
     * - The field status is set to [not pristine]
     * - Any currently running async validators are cancelled
     *
     * - All synchronous validators are called in the order specified
     * - If a validator fails:
     *    - The field status is set to invalid
     *    - The field error message is set to the error message for the validator that failed
     *    - Processing stops
     *
     * - If all synchronous validators pass:
     *    - The field status is set to [valid]
     *    - If there are NO async validators for the field:
     *       - The onUpdateField callback is called, and processing is finished
     *
     * - If there ARE async validators for the field:
     *    - All async validators are started immediately
     *    - The field status is set to [valid, validating]
     *    - The validators keep running asynchronously, but the handleFieldChange function terminates
     *
     * - The async validators keep running in the background until ONE of them fail, or ALL of them succeed:
     * - The first async validator to fail causes all processing to stop:
     *    - The field status is set to [invalid, not validating]
     *    - The field error message is set to the value that the validator rejected with
     * - If all async validators complete successfully:
     *    - The field status is set to [valid, not validating]
     *    - The onUpdateField callback is called
     */
    const handleFieldChange = useCallback(
        ({ fields, form }, fieldName: keyof Fields, event: any) => {
            const newValue = event.target.value;

            const field = getFieldProp(fieldName);

            // If the field has changeEvent=onBlur the change handler is triggered whenever the field loses focus.
            // So if the value didn't actually change, abort the change handler here.
            if (field.props && field.props.changeEvent === "onBlur" && newValue === field.value) {
                return;
            }

            // Using custom clone function to maximize speed, albeit more error prone
            // TODO: Remove custom clone function
            // const stateClone = getStateClone({ fields, form });
            const stateClone = { fields: { ...fields }, form: { ...form } };

            // Update value, and set pristine to false
            let updatedState = updateFieldState(stateClone, fieldName, { pristine: false, value: newValue });

            // Cancel async validators in progress (if any)
            if (asyncValidators[fieldName]) {
                cancelAsyncValidators(fieldName);
                updatedState = updateFieldState(stateClone, fieldName, { validating: false });
            }

            // Run synchronous validators
            const validatorResult = validateField(stateClone, fieldName, newValue);
            // Async validators - only run if sync validators pass
            if (validatorResult === true) {
                runAsyncValidators(field, stateClone, fieldName, newValue);
            } else {
                // Sync validators failed set field status to false
                updatedState = updateFieldState(stateClone, fieldName, { valid: false, error: validatorResult });

                // Also emit when the validator result is false
                onUpdateFormStatus(form);
                onUpdateField(fieldName, newValue);
            }

            setFields(updatedState.fields);
            setForm(updatedState.form);
        },
        [fields, form, asyncValidators]
    );

    const runAsyncValidators = (
        field: FieldsProp,
        stateClone: { fields: Fields; form: Form },
        fieldName: keyof Fields,
        newValue: string
    ) => {
        if ((field.asyncValidators || []).length > 0) {
            // Set field and form state to 'validating'
            const updatedState = updateFieldState(stateClone, fieldName, { validating: true });
            setFields(updatedState.fields);
            setForm(updatedState.form);

            onUpdateFormStatus(form);
            onUpdateField(fieldName, newValue);
            // TODO: Subscription to validation results could be done once in `componentDidMount` and be
            // disposed in the `componentWillUnmount` method. This way we don't have to create the
            // subscription every time the field is changed.
            asyncValidators[fieldName] = asyncValidationRunner
                .listenToValidatorsFor(fieldName)
                .subscribe((status: { fieldName: keyof Fields; isValid: boolean; message: string }) => {
                    if (!fields || !form) {
                        return;
                    }
                    const updatedState = updateFieldState(
                        { fields: { ...fields }, form: { ...form } },
                        status.fieldName,
                        {
                            validating: false,
                            valid: status.isValid,
                            error: status.message,
                        }
                    );
                    setFields(updatedState.fields);
                    setForm(updatedState.form);

                    cancelAsyncValidators(status.fieldName);
                    onUpdateFormStatus(form);
                });

            asyncValidationRunner.run(fieldName, field.asyncValidators, newValue);
        } else {
            const updatedState = updateFieldState(stateClone, fieldName, { valid: true });
            setFields(updatedState.fields);
            setForm(updatedState.form);
            onUpdateFormStatus(form);
            onUpdateField(fieldName, newValue);
        }
    };

    return render();
};

type FormBuilderProps = {
    id: any;
    fields: FieldsProp[];
    validatingLabelText: string;
    validatingProgressStyle: Record<string, any>;
    onUpdateField: Function;
    onUpdateFormStatus: Function;
    style: Record<string, any>;
    fieldWrapStyle: Record<string, any>;
    fieldWrapper: React.ElementType | keyof JSX.IntrinsicElements;
    mainWrapper: React.ElementType | keyof JSX.IntrinsicElements;
    validateOnRender: boolean;
    validateOnInitialRender: boolean;
    validateFullFormOnChanges: boolean;
    asyncValidationRunner?: AsyncValidatorRunner;
};

type FieldsProp = {
    name: keyof Fields;
    value: any;
    component: React.ElementType | keyof JSX.IntrinsicElements;
    props: {
        errorTextProp: string;
        changeEvent: "onChange" | "onBlur";
    };
    validators: {
        validator: Function;
        message: string;
    }[];
    asyncValidators: Function[];
    validatingLabelText: string;
};

type Field = {
    value: string;
    pristine: boolean;
    validating: boolean;
    valid: boolean;
    error: string | undefined;
};

type Fields = {
    username: Field;
    password: Field;
    firstName: Field;
    surname: Field;
    userRoles: Field;
    userGroups: Field;
    organisationUnits: Field;
    dataViewOrganisationUnits: Field;
    searchOrganisationsUnits: Field;
    disabled: Field;
};

type Form = {
    pristine: boolean;
    validating: boolean;
    valid: boolean;
};

type AsyncValidator = Record<string, any>;
