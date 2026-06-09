import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency, capitalize } from '@/lib/utils';
import {
  Mail,
  User,
  Info,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Zap,
  MessageSquare,
} from 'lucide-react';
import DocumentManager from '../customers/DocumentManager';
import { generateWhatsAppLink, generateEmailLink } from '@/lib/reminderUtils';

const LoanDetailsModal = ({ isOpen, onClose, loan, onUpdate }) => {
  if (!loan) return null;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'completed':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'defaulted':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
      case 'renewed':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
      default:
        return 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] !p-0 !gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-7 pb-5 flex items-start gap-3">
          <div
            className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5 ${getStatusStyles(loan.status)}`}
          >
            <ShieldCheck />
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1.5">
              Loan Details
            </p>
            <DialogTitle>Loan Agreement</DialogTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusStyles(loan.status)}`}
              >
                {loan.status}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400">
                ID: {loan._id.slice(-8)}
              </span>
              {loan.product && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary">
                  {loan.product.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-6 sm:pb-7 space-y-5 custom-scrollbar">
          {/* Quick Stats Banner */}
          <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-5 pointer-events-none">
              <Zap className="w-16 h-16 sm:w-24 sm:h-24 text-primary" />
            </div>
            <div className="space-y-1 relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                Monthly EMI
              </p>
              <p className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                {formatCurrency(loan.emi)}
              </p>
            </div>
            <div className="space-y-1 relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                Total Repayable
              </p>
              <p className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                {formatCurrency(loan.totalAmount)}
              </p>
            </div>
            <div className="space-y-1 relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400">
                Current Progress
              </p>
              <p className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                {Math.round((loan.paidAmount / loan.totalAmount) * 100)}%{' '}
                <span className="text-[10px] font-bold uppercase">Paid</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Left Segment: Borrower & Terms */}
            <div className="space-y-4 sm:space-y-5">
              {/* Borrower Details */}
              <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4 sm:p-5 space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <User className="w-3 h-3" /> Borrower Profile
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 group text-left">
                    <div className="h-8 w-8 rounded-full bg-white dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 flex items-center justify-center group-hover:text-primary transition-colors shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
                      <Info />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                        Full Name
                      </p>
                      <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-white truncate">
                        {capitalize(loan.customer?.name)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 group text-left">
                    <div className="h-8 w-8 rounded-full bg-white dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 flex items-center justify-center group-hover:text-primary transition-colors shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
                      <Mail />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                        Email Address
                      </p>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                        {loan.customer?.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loan Parameters */}
              <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4 sm:p-5 space-y-4 text-left">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" /> Agreement Terms
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Principal
                    </p>
                    <p className="text-sm font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white truncate">
                      {formatCurrency(loan.principal)}
                    </p>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Int. Rate
                    </p>
                    <p className="text-sm font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white truncate">
                      {loan.rate}%{' '}
                      <span className="text-[9px] font-bold text-slate-400">APR</span>
                    </p>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Duration
                    </p>
                    <p className="text-sm font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white truncate">
                      {loan.duration}{' '}
                      <span className="text-[9px] font-bold text-slate-400">Months</span>
                    </p>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Issue Date
                    </p>
                    <p className="text-sm font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white truncate">
                      {formatDate(loan.startDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Segment: Financial Breakdown */}
            <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 sm:p-5 space-y-5 flex flex-col justify-between text-left">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <Wallet className="w-3 h-3" /> Financial Distribution
              </h3>

              <div className="space-y-4 flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-end border-b border-slate-100 dark:border-white/[0.06] pb-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Total Amount
                    </p>
                    <p className="text-base font-medium tabular-nums text-slate-500 dark:text-slate-400">
                      {formatCurrency(loan.totalAmount)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-end border-b border-slate-100 dark:border-white/[0.06] pb-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400">
                      Recovered
                    </p>
                    <p className="text-lg font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(loan.paidAmount || 0)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-end pt-2 gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
                      Outstanding
                    </p>
                    <p className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-primary truncate">
                      {formatCurrency(loan.remainingAmount)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={generateWhatsAppLink(
                        loan.customer?.phone || '',
                        loan.customer?.name || '',
                        loan.emi,
                        new Date(),
                        false,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-primary/10 text-primary p-2.5 rounded-full hover:bg-primary hover:text-white transition-all active:scale-95 shrink-0"
                      title="Send WhatsApp Reminder"
                    >
                      <MessageSquare size={16} />
                    </a>
                    <a
                      href={generateEmailLink(
                        loan.customer?.email || '',
                        loan.customer?.name || '',
                        loan.emi,
                        new Date(),
                        false,
                      )}
                      className="bg-primary/10 text-primary p-2.5 rounded-full hover:bg-primary hover:text-white transition-all active:scale-95 shrink-0"
                      title="Send Email Reminder"
                    >
                      <Mail size={16} />
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-1000 ease-out"
                    style={{
                      width: `${(loan.paidAmount / loan.totalAmount) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mt-2 text-center">
                  Settlement Progress
                </p>
              </div>
            </div>
          </div>

          {/* Document Management Section */}
          <div className="pt-5 border-t border-slate-100 dark:border-white/[0.06]">
            <DocumentManager
              loanId={loan._id}
              documents={loan.documents || []}
              onUpdate={onUpdate}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanDetailsModal;
