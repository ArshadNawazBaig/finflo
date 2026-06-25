/* eslint-disable react/prop-types -- project convention: no propTypes (see EmptyState et al.) */
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Standard modal layout: a fixed header, a scrollable body, and a fixed
 * footer. Most modals re-implement this structure by hand; ModalShell makes it
 * one component.
 *
 * Designed to drop inside a Radix `<DialogContent>` rendered WITHOUT its own
 * padding/scroll. The base DialogContent ships `grid gap-5 overflow-y-auto`, so
 * neutralise those or the dialog scrolls and the pinned footer drops below the
 * fold:
 *   `<DialogContent className="p-0 gap-0 flex flex-col overflow-hidden overflow-y-hidden max-h-[90vh]">`
 * so the body — not the whole dialog — is what scrolls. For Radix
 * accessibility, pass a `<DialogTitle>` node as `title` (and optionally a
 * `<DialogDescription>` as `description`).
 *
 * @param {object} props
 * @param {React.ReactNode} [props.title] - Header title node.
 * @param {React.ReactNode} [props.description] - Sub-title under the title.
 * @param {React.ComponentType<{ className?: string }>} [props.icon] - lucide icon for the header chip.
 * @param {React.ReactNode} [props.footer] - Footer content (typically action buttons).
 * @param {React.ReactNode} props.children - Body content (scrollable region).
 * @param {string} [props.className] - Classes on the flex column wrapper.
 * @param {string} [props.headerClassName] - Classes on the header region.
 * @param {string} [props.bodyClassName] - Classes on the scrollable body.
 * @param {string} [props.footerClassName] - Classes on the footer region.
 * @returns {JSX.Element}
 *
 * @example
 * <Dialog open={open} onOpenChange={onClose}>
 *   <DialogContent className="p-0 gap-0 flex flex-col overflow-hidden overflow-y-hidden max-h-[90vh]">
 *     <ModalShell title={<DialogTitle>Add Member</DialogTitle>}
 *       footer={<Button isLoading={saving}>Save</Button>}>
 *       …form…
 *     </ModalShell>
 *   </DialogContent>
 * </Dialog>
 */
const ModalShell = ({
  title,
  description,
  icon: Icon,
  footer,
  children,
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
}) => (
  <div className={cn('flex flex-col min-h-0 max-h-[inherit]', className)}>
    {(title || description) && (
      <div
        className={cn(
          'shrink-0 flex items-start gap-3 px-6 pt-6 pb-4 sm:px-7',
          headerClassName,
        )}
      >
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
        )}
        <div className="min-w-0 space-y-1">
          {title}
          {description && (
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {description}
            </div>
          )}
        </div>
      </div>
    )}

    <div className={cn('flex-1 min-h-0 overflow-y-auto px-6 pb-2 sm:px-7', bodyClassName)}>
      {children}
    </div>

    {footer && (
      <div
        className={cn(
          'shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 py-4 sm:px-7 border-t border-border/60 bg-card',
          footerClassName,
        )}
      >
        {footer}
      </div>
    )}
  </div>
);

export default ModalShell;
export { ModalShell };
