import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

/**
 * Custom Tooltip Component refactored to use Radix UI
 * Wrap any element to show a tooltip on hover.
 * Uses Portals to render "independently" of parent overflow constraints.
 */
const Tooltip = ({
  children,
  content,
  position = 'top', // 'top' | 'bottom' | 'left' | 'right'
  className = '',
  delayDuration = 200,
}) => {
  if (!content) return children;

  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={position}
          sideOffset={8}
          className={cn(
            'z-[1000] overflow-hidden rounded-xl bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-muted-foreground shadow-2xl border border-border/50 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
            className,
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-white dark:fill-slate-800 drop-shadow-sm" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
};

export default Tooltip;
