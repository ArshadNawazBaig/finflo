/* eslint-disable react/prop-types -- project convention: no propTypes (see EmptyState et al.) */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FormField from '@/components/ui/FormField';

/**
 * Read-only account-number input paired with a "Generate" button — the
 * saving/current/loan account pattern previously inlined in AddMemberModal.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.label] - Field label.
 * @param {string} props.name - Field name + control id.
 * @param {string} [props.value] - Current account number.
 * @param {() => void} [props.onGenerate] - Click handler for the generate button (hidden if omitted).
 * @param {boolean} [props.generating] - Shows a spinner + disables the button.
 * @param {boolean} [props.required] - Marks the field required.
 * @param {string} [props.error] - Validation message.
 * @param {React.ReactNode} [props.hint] - Helper text.
 * @param {string} [props.placeholder='Click Generate'] - Placeholder when empty.
 * @param {boolean} [props.readOnly=true] - Whether the input is read-only.
 * @param {string} [props.className] - Extra classes on the field wrapper.
 * @returns {JSX.Element}
 *
 * @example
 * <AccountNumberField label="Saving A/C" name="savingAccount" value={sav}
 *   onGenerate={genSaving} generating={busy} />
 */
const AccountNumberField = ({
  label,
  name,
  value,
  onGenerate,
  generating,
  required,
  error,
  hint,
  placeholder = 'Click Generate',
  readOnly = true,
  className,
}) => (
  <FormField
    label={label}
    htmlFor={name}
    required={required}
    error={error}
    hint={hint}
    className={className}
  >
    <div className="flex items-center gap-2">
      <Input
        id={name}
        name={name}
        value={value || ''}
        readOnly={readOnly}
        placeholder={placeholder}
        className={cn('flex-1 tracking-wide', readOnly && 'bg-muted/50')}
      />
      {onGenerate && (
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onGenerate}
          isLoading={generating}
          className="shrink-0 gap-1.5"
        >
          Gen
        </Button>
      )}
    </div>
  </FormField>
);

export default AccountNumberField;
export { AccountNumberField };
