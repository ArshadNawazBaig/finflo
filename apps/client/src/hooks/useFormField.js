/**
 * Bridges a `react-hook-form` field to the `<FormField>` UI wrapper so call
 * sites don't hand-wire `register(...)`, the error message, and the
 * accessibility wiring at every input.
 *
 * Pass the form's `register` and `formState.errors`; get back the props to
 * spread onto a `<FormField>` and the matching control.
 *
 * @param {string} name - The field name registered with react-hook-form.
 * @param {object} options
 * @param {import('react-hook-form').UseFormRegister<any>} options.register - RHF `register`.
 * @param {import('react-hook-form').FieldErrors<any>} options.errors - RHF `formState.errors`.
 * @param {import('react-hook-form').RegisterOptions} [options.rules] - Validation rules for `register`.
 * @param {string} [options.label] - Field label, forwarded to `<FormField>`.
 * @param {string} [options.hint] - Helper text, forwarded to `<FormField>`.
 * @param {boolean} [options.required] - Marks the field required (label asterisk + `required` rule).
 * @returns {{ fieldProps: object, inputProps: object, error: string|undefined }}
 *   `fieldProps` → spread onto `<FormField>`; `inputProps` → spread onto the control.
 *
 * @example
 * const { fieldProps, inputProps } = useFormField('email', { register, errors, required: true, label: 'Email' });
 * return <FormField {...fieldProps}><Input type="email" {...inputProps} /></FormField>;
 */
export function useFormField(name, { register, errors, rules, label, hint, required } = {}) {
  const error = errors?.[name]?.message;
  const fieldRules = required ? { required: `${label || name} is required`, ...rules } : rules;

  return {
    fieldProps: {
      label,
      hint,
      required: !!required,
      error,
      htmlFor: name,
    },
    inputProps: {
      id: name,
      'aria-invalid': error ? 'true' : undefined,
      ...(register ? register(name, fieldRules) : {}),
    },
    error,
  };
}

export default useFormField;
