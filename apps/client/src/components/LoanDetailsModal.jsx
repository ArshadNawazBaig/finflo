import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatPKR } from '@/lib/utils';
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
          <div className="p-8 border-b border-border/50 flex justify-between items-center bg-muted/20">
            <div className="flex items-center gap-4">
              <div
                className={`p-4 rounded-2xl border ${getStatusStyles(loan.status)}`}
              >
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black tracking-tight">
                  Loan Agreement
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(loan.status)}`}
                  >
                    {loan.status}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    ID: {loan._id.slice(-8)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {/* Quick Stats Banner */}
            <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-6 grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Zap className="w-24 h-24 text-primary" />
              </div>
              <div className="space-y-1 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">
                  Monthly EMI
                </p>
                <p className="text-2xl font-black">{formatPKR(loan.emi)}</p>
              </div>
              <div className="space-y-1 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">
                  Total Repayable
                </p>
                <p className="text-2xl font-black">
                  {formatPKR(loan.totalAmount)}
                </p>
              </div>
              <div className="space-y-1 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  Current Progress
                </p>
                <p className="text-2xl font-black text-emerald-600">
                  {Math.round((loan.paidAmount / loan.totalAmount) * 100)}%{' '}
                  <span className="text-[10px] font-black uppercase">Paid</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Segment: Borrower & Terms */}
              <div className="space-y-6">
                {/* Borrower Details */}
                <div className="p-6 rounded-[2rem] bg-muted/30 border border-border/50 space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                    <User className="w-3 h-3" /> Borrower Profile
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 group">
                      <div className="p-2.5 rounded-xl bg-background border border-border/50 group-hover:text-primary transition-colors">
                        <Info className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                          Full Name
                        </p>
                        <p className="text-sm font-black">
                          {loan.customer?.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 group">
                      <div className="p-2.5 rounded-xl bg-background border border-border/50 group-hover:text-primary transition-colors">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                          Email Address
                        </p>
                        <p className="text-sm font-medium">
                          {loan.customer?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Loan Parameters */}
                <div className="p-6 rounded-[2rem] bg-muted/30 border border-border/50 space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" /> Agreement Terms
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                        Principal
                      </p>
                      <p className="text-md font-black flex items-center gap-1.5 underline decoration-emerald-500/30 decoration-2 underline-offset-4">
                        {formatPKR(loan.principal)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                        Interest Rate
                      </p>
                      <p className="text-md font-black flex items-center gap-1.5 underline decoration-indigo-500/30 decoration-2 underline-offset-4">
                        {loan.rate}% <span className="text-[8px]">APR</span>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                        Duration
                      </p>
                      <p className="text-md font-black flex items-center gap-1.5 underline decoration-primary/30 decoration-2 underline-offset-4">
                        {loan.duration}{' '}
                        <span className="text-[8px]">Months</span>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                        Issue Date
                      </p>
                      <p className="text-md font-black truncate underline decoration-muted-foreground/30 decoration-2 underline-offset-4">
                        {formatDate(loan.startDate)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Segment: Financial Breakdown */}
              <div className="p-8 rounded-[2rem] bg-card border border-border/50 shadow-xl space-y-6 flex flex-col justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <Wallet className="w-3 h-3" /> Financial Distribution
                </h3>

                <div className="space-y-5 flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-end border-b border-border/30 pb-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                        Total Amount
                      </p>
                      <p className="text-lg font-medium opacity-60">
                        {formatPKR(loan.totalAmount)}
                      </p>
                    </div>
                    <div className="w-12 h-[1px] bg-border/50 mb-3" />
                  </div>

                  <div className="flex justify-between items-end border-b border-border/30 pb-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70">
                        Amount Recovered
                      </p>
                      <p className="text-xl font-black text-emerald-600">
                        +{formatPKR(loan.paidAmount || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-[1px] bg-emerald-500/20 mb-3" />
                  </div>

                  <div className="flex justify-between items-end pt-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                        Outstanding Balance
                      </p>
                      <p className="text-3xl font-black text-primary tracking-tighter">
                        {formatPKR(loan.remainingAmount)}
                      </p>
                    </div>
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
                      className="bg-primary/10 text-primary p-3 rounded-2xl hover:bg-primary hover:text-white transition-all active:scale-95"
                      title="Send WhatsApp Reminder"
                    >
                      <MessageSquare size={20} />
                    </a>
                    <a
                      href={generateEmailLink(
                        loan.customer?.email || '',
                        loan.customer?.name || '',
                        loan.emi,
                        new Date(),
                        false,
                      )}
                      className="bg-primary/10 text-primary p-3 rounded-2xl hover:bg-primary hover:text-white transition-all active:scale-95"
                      title="Send Email Reminder"
                    >
                      <Mail size={20} />
                    </a>
                  </div>
                </div>

                <div className="pt-6">
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-1000 ease-out"
                      style={{
                        width: `${(loan.paidAmount / loan.totalAmount) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-2 text-center">
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
