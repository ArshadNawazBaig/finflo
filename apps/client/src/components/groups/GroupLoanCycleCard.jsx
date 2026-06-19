import { useState } from 'react';
import { Banknote, CheckCircle2, Loader2, Calendar, RefreshCw } from 'lucide-react';
import { formatCurrency, capitalize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import GroupLoanStatusBadge from '@/components/groups/GroupLoanStatusBadge';

// A single group-loan cycle with its per-member sub-loan allocations.
const GroupLoanCycleCard = ({
  groupLoan,
  index,
  onApprove,
  onRecordPayment,
  onRenew,
}) => {
  const [approving, setApproving] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await onApprove(groupLoan);
    } finally {
      setApproving(false);
    }
  };

  const allocations = groupLoan.allocations || [];

  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">
            #{index}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold capitalize">
                {capitalize(groupLoan.interestType || 'simple')} · {groupLoan.rate}%
              </span>
              <GroupLoanStatusBadge status={groupLoan.status} />
            </div>
            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
              <Calendar size={11} />
              {groupLoan.startDate
                ? new Date(groupLoan.startDate).toLocaleDateString()
                : '—'}{' '}
              · {groupLoan.duration} mo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {groupLoan.status === 'pending' && (
            <Button
              variant="ghost"
              onClick={handleApprove}
              disabled={approving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold shadow-[0_8px_20px_-8px_rgba(16,185,129,0.6)] transition-all disabled:opacity-60"
            >
              {approving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <CheckCircle2 size={13} />
              )}
              Approve & Disburse
            </Button>
          )}
          {['active', 'overdue'].includes(groupLoan.status) && (
            <>
              <Button
                variant="ghost"
                onClick={() => onRecordPayment(groupLoan)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border/50 text-[11px] font-bold text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 transition-all"
              >
                <Banknote size={13} />
                Record Payment
              </Button>
              {onRenew && (
                <Button
                  variant="ghost"
                  onClick={() => onRenew(groupLoan)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border/50 text-[11px] font-bold text-muted-foreground hover:bg-indigo-500/10 hover:text-indigo-600 transition-all"
                >
                  <RefreshCw size={13} />
                  Renew
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cycle totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="space-y-0.5">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
            Principal
          </span>
          <div className="font-black text-xs">
            {formatCurrency(groupLoan.totalPrincipal || 0)}
          </div>
        </div>
        <div className="space-y-0.5">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
            Outstanding
          </span>
          <div className="font-black text-xs">
            {formatCurrency(groupLoan.totalOutstanding || 0)}
          </div>
        </div>
        <div className="space-y-0.5">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
            Paid
          </span>
          <div className="font-black text-xs text-emerald-600">
            {formatCurrency(groupLoan.totalPaid || 0)}
          </div>
        </div>
        <div className="space-y-0.5">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
            Late Fees
          </span>
          <div className="font-black text-xs text-amber-600">
            {formatCurrency(groupLoan.totalLateFees || 0)}
          </div>
        </div>
      </div>

      {/* Per-member sub-loans */}
      <div className="rounded-xl border border-border/40 divide-y divide-border/40">
        {allocations.length === 0 && (
          <p className="px-4 py-4 text-center text-[11px] font-semibold text-muted-foreground">
            No member allocations on this cycle.
          </p>
        )}
        {allocations.map((a) => {
          const sub = a.loan || {};
          const outstanding =
            sub.remainingAmount ??
            (sub.totalAmount != null && sub.paidAmount != null
              ? sub.totalAmount - sub.paidAmount
              : undefined);
          return (
            <div
              key={a.loan?._id || a.customer?._id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold capitalize truncate">
                  {capitalize(a.customer?.name || 'Member')}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Principal {formatCurrency(a.principal || 0)}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                    Outstanding
                  </p>
                  <p className="text-xs font-black">
                    {outstanding != null ? formatCurrency(outstanding) : '—'}
                  </p>
                </div>
                {sub.status && <GroupLoanStatusBadge status={sub.status} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GroupLoanCycleCard;
