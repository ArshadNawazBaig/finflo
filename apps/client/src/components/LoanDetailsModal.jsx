import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatPKR, capitalize } from '@/lib/utils';
import {
  Calendar,
  DollarSign,
  Percent,
  Clock,
  Mail,
  User,
  Info,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Zap,
  MessageSquare,
} from 'lucide-react';
import DocumentManager from './DocumentManager';
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
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'defaulted':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0 border-none bg-transparent shadow-none">
        <div className="bg-white dark:bg-slate-900 border border-border/50 rounded-[2.5rem] flex flex-col h-full overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="px-4 py-4 sm:p-8 border-b border-border/50 flex justify-between items-center bg-muted/20">
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border ${getStatusStyles(loan.status)}`}
              >
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-3xl font-black tracking-tight">
                  Loan Agreement
                </DialogTitle>
                <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                  <span
                    className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(loan.status)}`}
                  >
                    {loan.status}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    ID: {loan._id.slice(-8)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:p-8 space-y-6 sm:space-y-8 custom-scrollbar">
            {/* Quick Stats Banner */}
            <div className="bg-primary/5 border border-primary/10 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-5 pointer-events-none">
                <Zap className="w-16 h-16 sm:w-24 sm:h-24 text-primary" />
              </div>
              <div className="space-y-0.5 sm:space-y-1 relative z-10">
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary/70">
                  Monthly EMI
                </p>
                <p className="text-xl sm:text-2xl font-black">
                  {formatPKR(loan.emi)}
                </p>
              </div>
              <div className="space-y-0.5 sm:space-y-1 relative z-10">
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary/70">
                  Total Repayable
                </p>
                <p className="text-xl sm:text-2xl font-black">
                  {formatPKR(loan.totalAmount)}
                </p>
              </div>
              <div className="space-y-0.5 sm:space-y-1 relative z-10">
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  Current Progress
                </p>
                <p className="text-xl sm:text-2xl font-black text-emerald-600">
                  {Math.round((loan.paidAmount / loan.totalAmount) * 100)}%{' '}
                  <span className="text-[9px] sm:text-[10px] font-black uppercase">
                    Paid
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* Left Segment: Borrower & Terms */}
              <div className="space-y-5 sm:space-y-6">
                {/* Borrower Details */}
                <div className="p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-muted/30 border border-border/50 space-y-3 sm:space-y-4">
                  <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                    <User className="w-3 h-3" /> Borrower Profile
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 group text-left">
                      <div className="p-2 sm:p-2.5 rounded-xl bg-background border border-border/50 group-hover:text-primary transition-colors shrink-0">
                        <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                          Full Name
                        </p>
                        <p className="text-xs sm:text-sm font-black truncate">
                          {capitalize(loan.customer?.name)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 group text-left">
                      <div className="p-2 sm:p-2.5 rounded-xl bg-background border border-border/50 group-hover:text-primary transition-colors shrink-0">
                        <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                          Email Address
                        </p>
                        <p className="text-xs sm:text-sm font-medium truncate">
                          {loan.customer?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Loan Parameters */}
                <div className="p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-muted/30 border border-border/50 space-y-3 sm:space-y-4 text-left">
                  <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" /> Agreement Terms
                  </h3>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-0.5 sm:space-y-1 min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                        Principal
                      </p>
                      <p className="text-sm sm:text-md font-black truncate underline decoration-emerald-500/30 decoration-2 underline-offset-4">
                        {formatPKR(loan.principal)}
                      </p>
                    </div>
                    <div className="space-y-0.5 sm:space-y-1 min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                        Int. Rate
                      </p>
                      <p className="text-sm sm:text-md font-black truncate underline decoration-indigo-500/30 decoration-2 underline-offset-4">
                        {loan.rate}%{' '}
                        <span className="text-[7px] sm:text-[8px]">APR</span>
                      </p>
                    </div>
                    <div className="space-y-0.5 sm:space-y-1 min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                        Duration
                      </p>
                      <p className="text-sm sm:text-md font-black truncate underline decoration-primary/30 decoration-2 underline-offset-4">
                        {loan.duration}{' '}
                        <span className="text-[7px] sm:text-[8px]">Months</span>
                      </p>
                    </div>
                    <div className="space-y-0.5 sm:space-y-1 min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                        Issue Date
                      </p>
                      <p className="text-sm sm:text-md font-black truncate underline decoration-muted-foreground/30 decoration-2 underline-offset-4">
                        {formatDate(loan.startDate)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Segment: Financial Breakdown */}
              <div className="p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] bg-card border border-border/50 shadow-xl space-y-5 sm:space-y-6 flex flex-col justify-between text-left">
                <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <Wallet className="w-3 h-3" /> Financial Distribution
                </h3>

                <div className="space-y-4 sm:space-y-5 flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-end border-b border-border/30 pb-3 sm:pb-4">
                    <div className="space-y-0.5 sm:space-y-1">
                      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                        Total Amount
                      </p>
                      <p className="text-base sm:text-lg font-medium opacity-60">
                        {formatPKR(loan.totalAmount)}
                      </p>
                    </div>
                    <div className="w-8 sm:w-12 h-[1px] bg-border/50 mb-2 sm:mb-3" />
                  </div>

                  <div className="flex justify-between items-end border-b border-border/30 pb-3 sm:pb-4">
                    <div className="space-y-0.5 sm:space-y-1">
                      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-600/70">
                        Recovered
                      </p>
                      <p className="text-lg sm:text-xl font-black text-emerald-600">
                        +{formatPKR(loan.paidAmount || 0)}
                      </p>
                    </div>
                    <div className="w-8 sm:w-12 h-[1px] bg-emerald-500/20 mb-2 sm:mb-3" />
                  </div>

                  <div className="flex justify-between items-end pt-3 sm:pt-4 gap-2">
                    <div className="space-y-0.5 sm:space-y-1 flex-1 min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary">
                        Outstanding
                      </p>
                      <p className="text-2xl sm:text-3xl font-black text-primary tracking-tighter truncate">
                        {formatPKR(loan.remainingAmount)}
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
                        className="bg-primary/10 text-primary p-2.5 sm:p-3 rounded-xl sm:rounded-2xl hover:bg-primary hover:text-white transition-all active:scale-95 shrink-0"
                        title="Send WhatsApp Reminder"
                      >
                        <MessageSquare size={18} />
                      </a>
                      <a
                        href={generateEmailLink(
                          loan.customer?.email || '',
                          loan.customer?.name || '',
                          loan.emi,
                          new Date(),
                          false,
                        )}
                        className="bg-primary/10 text-primary p-2.5 sm:p-3 rounded-xl sm:rounded-2xl hover:bg-primary hover:text-white transition-all active:scale-95 shrink-0"
                        title="Send Email Reminder"
                      >
                        <Mail size={18} />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="pt-4 sm:pt-6">
                  <div className="h-1.5 sm:h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-1000 ease-out"
                      style={{
                        width: `${(loan.paidAmount / loan.totalAmount) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1.5 sm:mt-2 text-center">
                    Settlement Progress
                  </p>
                </div>
              </div>
            </div>

            {/* Document Management Section */}
            <div className="pt-8 border-t border-border/50">
              <DocumentManager
                loanId={loan._id}
                documents={loan.documents || []}
                onUpdate={onUpdate}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanDetailsModal;
