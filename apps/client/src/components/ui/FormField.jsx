/* eslint-disable react/prop-types -- project convention: no propTypes (see EmptyState et al.) */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Field, FieldLabel } from '@/components/ui/field';

/**
 * Standard form-field wrapper: label (with optional required marker), the
 * control (passed as children), and a hint or error message below it. Replaces
 * the hand-written `<label>` + error `<p>` pattern duplicated across every modal.
 *
 * The error message takes precedence over the hint when both are present.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.label] - Field label text/node.
 * @param {string} [props.htmlFor] - id of the control, wires the label for a11y.
 * @param {boolean} [props.required] - Shows a `*` after the label.
 * @param {string} [props.error] - Validation message (rendered in rose, role="alert").
 * @param {React.ReactNode} [props.hint] - Helper text shown when there's no error.
 * @param {string} [props.className] - Extra classes on the field wrapper.
 * @param {React.ReactNode} props.children - The input/select/textarea control.
 * @returns {JSX.Element}
 *
 * @example
 * <FormField label="Full Name" htmlFor="name" required error={errors.name?.message}>
 *   <Input id="name" {...register('name')} />
 * </FormField>
 */
const FormField = ({ label, htmlFor, required, error, hint, className, children }) => (
  <Field className={className}>
    {label && (
      <FieldLabel htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="text-rose-500 ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </FieldLabel>
    )}
    {children}
    {error ? (
      <p className="text-[11px] font-medium text-rose-500 px-1" role="alert">
        {error}
      </p>
    ) : (
      hint && (
        <p className={cn('text-[11px] text-muted-foreground px-1')}>{hint}</p>
      )
    )}
  </Field>
);

export default FormField;
export { FormField };
