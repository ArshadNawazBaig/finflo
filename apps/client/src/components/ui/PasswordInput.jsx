import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A reusable password input with a show/hide toggle eye icon.
 * Accepts all standard <input> props plus an optional `leftIcon` (JSX).
 */
const PasswordInput = ({ className, leftIcon, id, ...props }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative group">
      {leftIcon && (
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {leftIcon}
        </div>
      )}
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className={cn(
          'w-full h-12 pr-11 rounded-xl bg-muted/20 border border-border focus:border-primary focus:bg-background transition-all outline-none text-sm font-medium',
          leftIcon ? 'pl-11' : 'pl-4',
          className,
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};

export default PasswordInput;
