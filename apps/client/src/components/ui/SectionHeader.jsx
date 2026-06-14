/* eslint-disable react/prop-types -- project convention: no propTypes (see EmptyState et al.) */
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Section divider for modals and forms (e.g. "Nominee Information",
 * "Account Numbers"). Renders an optional leading icon chip, a title, an
 * optional description, and an optional right-aligned action slot.
 *
 * @param {object} props
 * @param {React.ReactNode} props.title - Section title.
 * @param {React.ReactNode} [props.description] - Secondary line under the title.
 * @param {React.ComponentType<{ className?: string }>} [props.icon] - lucide icon component.
 * @param {React.ReactNode} [props.action] - Right-aligned action (button/link).
 * @param {boolean} [props.divider] - Render a top hairline border + spacing.
 * @param {string} [props.className] - Extra classes on the wrapper.
 * @returns {JSX.Element}
 *
 * @example
 * <SectionHeader title="Nominee Information" icon={Users} description="Optional" />
 */
const SectionHeader = ({ title, description, icon: Icon, action, divider, className }) => (
  <div
    className={cn(
      'flex items-center justify-between gap-3',
      divider && 'border-t border-border/60 pt-5 mt-1',
      className,
    )}
  >
    <div className="flex items-center gap-2.5 min-w-0">
      {Icon && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      )}
      <div className="min-w-0">
        <h3 className="text-sm font-bold tracking-tight text-foreground truncate">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground leading-snug">{description}</p>
        )}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export default SectionHeader;
export { SectionHeader };
