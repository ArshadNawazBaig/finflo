import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const InputGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('relative flex items-center', className)}
    {...props}
  />
));
InputGroup.displayName = 'InputGroup';

const InputGroupInput = React.forwardRef(({ className, ...props }, ref) => (
  <Input ref={ref} className={cn('pr-10', className)} {...props} />
));
InputGroupInput.displayName = 'InputGroupInput';

const InputGroupAddon = React.forwardRef(
  ({ className, align, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'absolute inset-y-0 flex items-center',
        align === 'inline-end' ? 'right-0 pr-3' : 'left-0 pl-3',
        className,
      )}
      {...props}
    />
  ),
);
InputGroupAddon.displayName = 'InputGroupAddon';

const InputGroupButton = React.forwardRef(({ className, ...props }, ref) => (
  <Button ref={ref} className={cn('h-8 w-8 p-0', className)} {...props} />
));
InputGroupButton.displayName = 'InputGroupButton';

export { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton };
