/* eslint-disable react/prop-types -- project convention: no propTypes */
import FormField from '@/components/ui/FormField';

/**
 * Branch picker with staff/admin branching:
 * - staff: locked to their assigned branch (set programmatically by the parent),
 * - admin with no branches: an inline "create a branch first" notice,
 * - admin: a native <select> wired through react-hook-form's `register`.
 *
 * A native select (rather than the Radix ui Select) is used here on purpose:
 * it integrates with `register` without a Controller, stays keyboard/screen-
 * reader accessible, and preserves the combobox/option test contract. It's
 * styled to match the ui Input.
 */
const SELECT_CLASS =
  'flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const MemberBranchSelector = ({ user, register, branches, fetchingBranches, errors }) => {
  if (user?.role === 'staff') {
    return (
      <FormField label="Branch Selection">
        <div className="w-full rounded-md border border-input bg-muted/40 px-3 py-2 text-xs font-bold text-muted-foreground italic">
          Assigned to your branch
        </div>
      </FormField>
    );
  }

  if (!fetchingBranches && branches.length === 0) {
    return (
      <FormField label="Branch Selection">
        <div className="w-full rounded-md border border-amber-200 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/[0.06] px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-400">
          Create a branch first — members must belong to a branch.
        </div>
      </FormField>
    );
  }

  return (
    <FormField label="Branch Selection" htmlFor="branchId" error={errors.branchId?.message}>
      <select
        id="branchId"
        className={SELECT_CLASS}
        {...register('branchId', { required: 'Branch is required' })}
      >
        <option value="">Select Branch</option>
        {branches.map((b) => (
          <option key={b._id} value={b._id}>
            {b.name}
            {b.isDefault ? ' (Default)' : ''}
          </option>
        ))}
      </select>
    </FormField>
  );
};

export default MemberBranchSelector;
