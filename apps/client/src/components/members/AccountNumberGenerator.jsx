/* eslint-disable react/prop-types -- project convention: no propTypes */
import AccountNumberField from '@/components/ui/AccountNumberField';

/**
 * Saving / Current / Loan account-number generators. Uses the shared
 * AccountNumberField primitive; the Generate button hides once a number exists
 * (matching the original behaviour). Generation state lives in the parent.
 *
 * The Loan field is optional — omit the `loan` prop entirely to render just
 * Saving + Current (e.g. the customer modals, which have no loan account).
 *
 * @param {object} props
 * @param {string} props.saving / props.current - Current values.
 * @param {string} [props.loan] - Loan account value; omit to hide the loan field.
 * @param {(type: 'savingAccountNumber'|'currentAccountNumber'|'loanAccountNumber') => void} props.onGenerate
 */
const AccountNumberGenerator = ({ saving, current, loan, onGenerate }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
    <AccountNumberField
      label="Saving Account"
      name="savingAccount"
      value={saving}
      onGenerate={saving ? undefined : () => onGenerate('savingAccountNumber')}
    />
    <AccountNumberField
      label="Current Account"
      name="currentAccount"
      value={current}
      onGenerate={current ? undefined : () => onGenerate('currentAccountNumber')}
    />
    {loan !== undefined && (
      <AccountNumberField
        label="Loan Account"
        name="loanAccount"
        value={loan}
        onGenerate={loan ? undefined : () => onGenerate('loanAccountNumber')}
        className="sm:col-span-2"
      />
    )}
  </div>
);

export default AccountNumberGenerator;
