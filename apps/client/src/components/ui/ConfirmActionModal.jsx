import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ConfirmActionModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  variant = 'danger', // 'danger' | 'warning' | 'info'
  children,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle size={16} strokeWidth={2.5} />,
          chipTone: 'bg-rose-500/10 text-rose-500 dark:text-rose-400',
          eyebrow: 'text-rose-500 dark:text-rose-400',
          btnBg:
            'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_10px_30px_-10px_rgba(244,63,94,0.5)]',
          chipArrowTone: 'text-rose-500',
          accentLabel: 'Destructive action',
          accentNote: 'This cannot be undone.',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={16} strokeWidth={2.5} />,
          chipTone: 'bg-amber-500/10 text-amber-500 dark:text-amber-400',
          eyebrow: 'text-amber-500 dark:text-amber-400',
          btnBg:
            'bg-amber-500 hover:bg-amber-600 text-white shadow-[0_10px_30px_-10px_rgba(245,158,11,0.5)]',
          chipArrowTone: 'text-amber-500',
          accentLabel: 'Heads up',
          accentNote: 'Review the details before confirming.',
        };
      case 'info':
      default:
        return {
          icon: <Info size={16} strokeWidth={2.5} />,
          chipTone: 'bg-primary/10 text-primary',
          eyebrow: 'text-primary',
          btnBg:
            'bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)]',
          chipArrowTone: 'text-primary',
          accentLabel: 'Confirm action',
          accentNote: 'You can change this later.',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md !p-0 !gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-7 pb-5 flex items-start gap-3">
          <div
            className={cn(
              'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
              styles.chipTone,
            )}
          >
            {styles.icon}
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <p
              className={cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5',
                styles.eyebrow,
              )}
            >
              {styles.accentLabel}
            </p>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription className="mt-2">
                {description}
              </DialogDescription>
            )}
          </div>
        </div>

        {/* Optional children content */}
        {children && (
          <div className="px-6 sm:px-7 pb-2">
            <div className="rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-4">
              {children}
            </div>
          </div>
        )}

        {/* Soft accent note */}
        <div className="px-6 sm:px-7 pb-4">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <AlertCircle
              size={12}
              className={cn('shrink-0', styles.chipArrowTone)}
            />
            {styles.accentNote}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-white/[0.06]">
          <button
            onClick={onClose}
            disabled={loading}
            className="h-11 px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <Button
            onClick={onConfirm}
            isLoading={loading}
            className={cn(
              'h-11 px-7 rounded-full font-bold text-sm transition-all hover:-translate-y-0.5',
              styles.btnBg,
            )}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmActionModal;
