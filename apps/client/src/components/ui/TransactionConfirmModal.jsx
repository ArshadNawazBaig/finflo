import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Banknote, HandCoins, Send, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';

/**
 * TransactionConfirmModal — Reusable confirmation dialog for financial transactions.
 *
 * Props:
 *   isOpen       — boolean, controls visibility
 *   onClose      — function, close handler
 *   onConfirm    — function, execute the transaction
 *   loading      — boolean, shows spinner on confirm button
 *   type         — 'credit' | 'debit' | 'transfer' | 'loan-payment' | 'cash-opening' | 'custom'
 *   title        — string, modal heading (auto-inferred from type if omitted)
 *   amount       — number, the transaction amount
 *   details      — array of { label, value } to display as summary rows
 *   description  — string, optional note/description
 *   confirmText  — string, confirm button label (defaults based on type)
 */
const TransactionConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  type = 'custom',
  title,
  amount,
  details = [],
  description,
  confirmText,
}) => {
  const typeConfig = {
    credit: {
      icon: <ArrowDownCircle className="w-6 h-6" />,
      iconBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      amountColor: 'text-emerald-600',
      btnClass: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20',
      defaultTitle: 'Confirm Deposit',
      defaultConfirm: 'Confirm Deposit',
      badgeText: 'Credit Transaction',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    },
    debit: {
      icon: <ArrowUpCircle className="w-6 h-6" />,
      iconBg: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      gradient: 'from-rose-500/10 via-rose-500/5 to-transparent',
      amountColor: 'text-rose-600',
      btnClass: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20',
      defaultTitle: 'Confirm Withdrawal',
      defaultConfirm: 'Confirm Withdrawal',
      badgeText: 'Debit Transaction',
      badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    },
    transfer: {
      icon: <Send className="w-6 h-6" />,
      iconBg: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
      gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent',
      amountColor: 'text-indigo-600',
      btnClass: 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20',
      defaultTitle: 'Confirm Transfer',
      defaultConfirm: 'Confirm Transfer',
      badgeText: 'Fund Transfer',
      badgeClass: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    },
    'loan-payment': {
      icon: <Banknote className="w-6 h-6" />,
      iconBg: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
      gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent',
      amountColor: 'text-indigo-600',
      btnClass: 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20',
      defaultTitle: 'Confirm Loan Payment',
      defaultConfirm: 'Confirm Payment',
      badgeText: 'Loan Repayment',
      badgeClass: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    },
    'cash-opening': {
      icon: <HandCoins className="w-6 h-6" />,
      iconBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      amountColor: 'text-emerald-600',
      btnClass: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20',
      defaultTitle: 'Set Cash in Hand',
      defaultConfirm: 'Confirm',
      badgeText: 'Cash Opening',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    },
    custom: {
      icon: <AlertTriangle className="w-6 h-6" />,
      iconBg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
      amountColor: 'text-amber-600',
      btnClass: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
      defaultTitle: 'Confirm Transaction',
      defaultConfirm: 'Confirm',
      badgeText: 'Transaction',
      badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    },
  };

  const config = typeConfig[type] || typeConfig.custom;
  const modalTitle = title || config.defaultTitle;
  const btnText = confirmText || config.defaultConfirm;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-card border-border/50 rounded-3xl">
        {/* Header */}
        <div className={cn('relative p-6 pb-4 bg-gradient-to-br border-b border-border/50', config.gradient)}>
          <div className="flex items-center gap-4">
            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border', config.iconBg)}>
              {config.icon}
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight">
                {modalTitle}
              </DialogTitle>
              <DialogDescription className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-widest mt-1">
                Please review and confirm
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Amount Display */}
          {amount !== undefined && amount !== null && (
            <div className="text-center py-4 rounded-2xl bg-muted/30 border border-border/50">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">
                Transaction Amount
              </p>
              <p className={cn('text-3xl font-black tracking-tight', config.amountColor)}>
                {formatCurrency(amount)}
              </p>
            </div>
          )}

          {/* Transaction Details */}
          {details.length > 0 && (
            <div className="space-y-2 p-4 rounded-2xl bg-muted/20 border border-border/30">
              {details.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    {item.label}
                  </span>
                  <span className="text-xs font-bold text-foreground truncate max-w-[55%] text-right">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          {description && (
            <div className="p-3 rounded-xl bg-muted/10 border border-border/20">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Note</p>
              <p className="text-xs font-medium text-muted-foreground leading-relaxed">{description}</p>
            </div>
          )}

          {/* Type Badge */}
          <div className="flex items-center justify-center">
            <span className={cn('px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border', config.badgeClass)}>
              {config.badgeText}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                'flex-[2] h-12 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95',
                config.btnClass,
              )}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : btnText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionConfirmModal;
