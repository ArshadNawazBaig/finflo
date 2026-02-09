import { cn } from '@/lib/utils';

/**
 * Custom Tooltip Component
 * Wrap any element to show a tooltip on hover
 *
 * Usage:
 * <Tooltip content="This is a tooltip">
 *   <button>Hover me</button>
 * </Tooltip>
 */
const Tooltip = ({
  children,
  content,
  position = 'top', // 'top' | 'bottom' | 'left' | 'right'
  className = '',
}) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -translate-y-1 border-l border-b',
    bottom:
      'bottom-full left-1/2 -translate-x-1/2 translate-y-1 border-r border-t',
    left: 'left-full top-1/2 -translate-y-1/2 -translate-x-1 border-t border-r',
    right:
      'right-full top-1/2 -translate-y-1/2 translate-x-1 border-b border-l',
  };

  return (
    <div className="relative group/tooltip inline-flex">
      {children}
      <div
        className={cn(
          'absolute px-2.5 py-1.5 bg-white dark:bg-slate-800 text-foreground text-xs font-medium rounded-lg',
          'opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible',
          'transition-all duration-200 whitespace-nowrap z-[100]',
          'shadow-lg border border-border/50 pointer-events-none',
          positionClasses[position],
          className,
        )}
      >
        {content}
        <div
          className={cn(
            'absolute w-2 h-2 bg-white dark:bg-slate-800 rotate-45 border-border/50',
            arrowClasses[position],
          )}
        />
      </div>
    </div>
  );
};

export default Tooltip;
