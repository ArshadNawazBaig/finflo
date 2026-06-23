/* eslint-disable react/prop-types -- project convention: no propTypes */
import { getPasswordStrength } from '@/lib/passwordPolicy';
import { cn } from '@/lib/utils';

/**
 * Real-time password strength meter — a thin progress bar that fills and shifts
 * colour (rose → orange → amber → emerald) as the typed value satisfies more of
 * the policy rules, reaching full + green only when the full policy is met.
 */
const PasswordStrengthBar = ({ value = '', className = '' }) => {
  const { percent, label, barClass, textClass } = getPasswordStrength(value);
  return (
    <div className={cn('space-y-1', className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.08]">
        <div
          className={cn('h-full rounded-full transition-all duration-300', barClass)}
          style={{ width: `${percent}%` }}
        />
      </div>
      {label && (
        <p className={cn('text-[11px] font-semibold', textClass)}>
          Password strength: {label}
        </p>
      )}
    </div>
  );
};

export default PasswordStrengthBar;
