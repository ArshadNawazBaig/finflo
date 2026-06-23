/* eslint-disable react/prop-types -- project convention: no propTypes */
import { PASSWORD_HINT } from '@/lib/passwordPolicy';
import { cn } from '@/lib/utils';
import PasswordStrengthBar from './PasswordStrengthBar';

/**
 * Password feedback rendered directly under a "new password" field. Before the
 * user types it shows the concise policy hint; once they start typing it becomes
 * a real-time strength progress bar. Render it unconditionally under the input —
 * it owns its own empty state, so no `value &&` guard is needed at the call site.
 */
const PasswordRequirements = ({ value = '', className = '' }) => {
  if (!value) {
    return (
      <p
        className={cn(
          'mt-2 text-[11px] font-medium text-slate-400 dark:text-slate-500',
          className,
        )}
      >
        {PASSWORD_HINT}
      </p>
    );
  }

  return <PasswordStrengthBar value={value} className={cn('mt-2', className)} />;
};

export default PasswordRequirements;
