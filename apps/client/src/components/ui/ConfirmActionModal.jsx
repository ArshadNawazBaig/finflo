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
  children, // Optional additional content
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-6 h-6" />,
          iconBg: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
          titleColor: 'text-rose-600',
          btnBg: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20',
          accentBg: 'bg-rose-500/5 border-rose-500/10',
          accentIcon: <AlertCircle className="w-5 h-5 text-rose-600" />,
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6" />,
          iconBg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
          titleColor: 'text-amber-600',
          btnBg: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
          accentBg: 'bg-amber-500/5 border-amber-500/10',
          accentIcon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-6 h-6" />,
          iconBg: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
          titleColor: 'text-blue-600',
          btnBg: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20',
          accentBg: 'bg-blue-500/5 border-blue-500/10',
          accentIcon: <Info className="w-5 h-5 text-blue-600" />,
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] !p-0 !gap-0 flex flex-col overflow-hidden rounded-[2.5rem] border-border/50 shadow-2xl">
        {/* Fixed Header */}
        <div className="p-8 border-b bg-background z-10 shrink-0 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div
              className={cn(
                'p-3 rounded-2xl shadow-sm border shrink-0',
                styles.iconBg,
              )}
            >
              {styles.icon}
            </div>
            <div>
              <DialogTitle
                className={cn(
                  'text-2xl font-black tracking-tight',
                  styles.titleColor,
                )}
              >
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground/80 mt-1">
                {description}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-900/10">
          <div className="space-y-6">
            <div
              className={cn(
                'p-6 rounded-[2rem] flex items-start gap-4 shadow-sm border',
                styles.accentBg,
              )}
            >
              <div className="p-2 rounded-full bg-background/50 shrink-0 hidden sm:block">
                {styles.accentIcon}
              </div>
              <div className="text-center sm:text-left">
                <p className="text-sm font-semibold text-foreground/80 leading-relaxed">
                  This action is permanent and may have unintended consequences.
                  Please confirm your decision.
                </p>
                <p className="text-[11px] font-bold text-muted-foreground/60 mt-2 uppercase tracking-wider">
                  Caution: Cannot be undone
                </p>
              </div>
            </div>
            {children}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-8 border-t bg-background shrink-0 flex flex-col sm:flex-row gap-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 min-h-14 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-muted transition-all rounded-[1.25rem] border border-transparent hover:border-border/50 active:scale-95 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <Button
            onClick={onConfirm}
            isLoading={loading}
            className={cn(
              'flex-1 min-h-14 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl transition-all active:scale-95',
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
