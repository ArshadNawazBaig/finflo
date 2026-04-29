import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SensitiveData — Bank-grade PII visibility toggle
 * Shows masked data by default with an eye icon to reveal.
 * Used for balances, CNIC, account numbers, phone numbers, etc.
 */
const SensitiveData = ({
  children,
  maskChar = '•',
  maskLength,
  className,
  iconSize = 14,
  iconClassName,
  inline = false,
  defaultVisible = false,
}) => {
  const [visible, setVisible] = useState(defaultVisible);

  // Generate mask based on content length or fixed length
  const contentStr = typeof children === 'string' ? children : '';
  const mask = maskChar.repeat(maskLength || Math.max(contentStr.length, 6));

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        inline && 'inline',
        className,
      )}
    >
      <span className={cn(!visible && 'select-none')}>
        {visible ? children : mask}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setVisible((v) => !v);
        }}
        className={cn(
          'inline-flex items-center justify-center shrink-0 rounded-md p-1 transition-all',
          'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50',
          'active:scale-90',
          iconClassName,
        )}
        title={visible ? 'Hide' : 'Show'}
        aria-label={visible ? 'Hide sensitive data' : 'Show sensitive data'}
      >
        {visible ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
      </button>
    </span>
  );
};

/**
 * SensitiveBalance — Specifically for currency amounts.
 * Shows "Rs.••••••" when hidden.
 */
export const SensitiveBalance = ({
  children,
  className,
  defaultVisible = false,
  iconSize = 14,
  iconClassName,
}) => {
  const [visible, setVisible] = useState(defaultVisible);

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn(!visible && 'select-none')}>
        {visible ? children : 'Rs.••••••'}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setVisible((v) => !v);
        }}
        className={cn(
          'inline-flex items-center justify-center shrink-0 rounded-md p-1 transition-all',
          'text-current opacity-30 hover:opacity-70',
          'active:scale-90',
          iconClassName,
        )}
        title={visible ? 'Hide balance' : 'Show balance'}
      >
        {visible ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
      </button>
    </span>
  );
};

export default SensitiveData;
