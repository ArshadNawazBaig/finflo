import { Link } from 'react-router-dom';
import {
  Banknote,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Info,
  MessageSquare,
  Mail,
  Download,
} from 'lucide-react';
import { formatCurrency, capitalize, cn } from '@/lib/utils';
import { generateWhatsAppLink, generateEmailLink } from '@/lib/reminderUtils';
import Tooltip from '@/components/ui/Tooltip';
import ApprovalActions from '@/components/loans/ApprovalActions';
import { exportLoanStatement } from '@/lib/pdfExportUtils';
import { Button } from '@/components/ui/button';

const LoanCard = ({ loan, onEdit, onDelete, onRefresh }) => {
  const progress = Math.min(
    Math.round((loan.paidAmount / loan.totalAmount) * 100),
    100,
  );

  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-[1.5rem] p-5 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg group-hover:bg-primary/20 transition-colors">
            {loan.customer?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex flex-col">
            <Link
              to={`/customers/${loan.customer?._id}`}
              className="font-bold text-base hover:text-primary transition-colors cursor-pointer block leading-tight"
            >
              {capitalize(loan.customer?.name || 'Unknown')}
            </Link>
            <span className="text-[10px] text-muted-foreground/60 font-medium ">
              ID: {loan._id.slice(-6).toUpperCase()}
            </span>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
            loan.status === 'active'
              ? 'bg-blue-500/10 text-blue-600'
              : loan.status === 'completed'
                ? 'bg-emerald-500/10 text-emerald-600'
                : loan.status === 'pending'
                  ? 'bg-amber-500/10 text-amber-600'
                  : loan.status === 'rejected'
                    ? 'bg-red-500/10 text-red-600'
                    : 'bg-slate-500/10 text-slate-600'
          }`}
        >
          {loan.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Principal
          </span>
          <div className="font-black text-sm">
            {formatCurrency(loan.principal)}
          </div>
        </div>
        <div className="space-y-1 text-right">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Term
          </span>
          <div className="font-bold text-sm bg-muted/50 inline-block px-2 py-0.5 rounded-lg">
            {loan.termMonths || 'N/A'} Mo
          </div>
        </div>
        <div className="col-span-2 space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Repayment Progress
            </span>
            <span className="text-[10px] font-black text-primary">
              {progress}%
            </span>
          </div>
          <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border/30">
        <div className="flex items-center gap-1">
          {loan.status === 'pending' && (
            <div className="mr-2 pr-2 border-r border-border/30">
              <ApprovalActions
                loan={loan}
                onSuccess={() => onRefresh && onRefresh()}
              />
            </div>
          )}
          <Tooltip content="WhatsApp" position="top">
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
              className="p-2 rounded-xl hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-all active:scale-90"
            >
              <MessageSquare size={18} />
            </a>
          </Tooltip>
          <Tooltip content="Email" position="top">
            <a
              href={generateEmailLink(
                loan.customer?.email || '',
                loan.customer?.name || '',
                loan.emi,
                new Date(),
                false,
              )}
              className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all active:scale-90"
            >
              <Mail size={18} />
            </a>
          </Tooltip>
          <Tooltip content="Download Statement" position="top">
            <Button
              variant="outline"
              size="icon"
              onClick={() => exportLoanStatement(loan, loan.repayments || [])}
              className="h-9 w-9 rounded-xl border-border/50 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600 transition-all active:scale-90"
            >
              <Download size={18} />
            </Button>
          </Tooltip>
          <Tooltip content="Edit" position="top">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onEdit(loan)}
              className="h-9 w-9 rounded-xl border-border/50 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600 transition-all active:scale-90"
            >
              <Edit size={18} />
            </Button>
          </Tooltip>
          <Tooltip content="Delete" position="top">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onDelete(loan)}
              className="h-9 w-9 rounded-xl border-destructive/20 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all active:scale-90"
            >
              <Trash2 size={18} />
            </Button>
          </Tooltip>
        </div>
        <Link
          to={`/loans/${loan._id}`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 transition-all active:scale-95"
        >
          <Info size={14} strokeWidth={3} />
          Details
        </Link>
      </div>
    </div>
  );
};

export default LoanCard;
