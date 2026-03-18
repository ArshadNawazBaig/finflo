import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const Field = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-2', className)} {...props} />
));
Field.displayName = 'Field';

const FieldLabel = React.forwardRef(({ className, ...props }, ref) => (
  <Label
    ref={ref}
    className={cn(
      'text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1',
      className,
    )}
    {...props}
  />
));
FieldLabel.displayName = 'FieldLabel';

export { Field, FieldLabel };
