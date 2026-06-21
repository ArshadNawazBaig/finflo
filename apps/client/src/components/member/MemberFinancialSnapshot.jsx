import { useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  Wallet,
  Shield,
  ArrowUpRight,
  Plus,
  TrendingUp,
  Coins,
  ArrowDownLeft,
  Sparkles,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const MASKED = '******';

// Maps the API grade string to a colored band used by the credit-score pill.
const GRADE_BANDS = {
  Excellent: {
    label: 'Excellent',
    text: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    dot: 'bg-emerald-500',
  },
  Good: {
    label: 'Good',
    text: 'text-primary',
    bg: 'bg-primary/10',
    dot: 'bg-primary',
  },
  Fair: {
    label: 'Fair',
    text: 'text-amber-600',
    bg: 'bg-amber-500/10',
    dot: 'bg-amber-500',
  },
  Poor: {
    label: 'Poor',
    text: 'text-orange-600',
    bg: 'bg-orange-500/10',
    dot: 'bg-orange-500',
  },
  'Very Poor': {
    label: 'Very Poor',
    text: 'text-red-600',
    bg: 'bg-red-500/10',
    dot: 'bg-red-500',
  },
};

// Stacked-bar segment colors for the balance split.
const SEGMENTS = [
  { key: 'current', label: 'Current', color: '#6366f1' },
  { key: 'saving', label: 'Saving', color: '#14b8a6' },
  { key: 'share', label: 'Share', color: '#f59e0b' },
];

const MemberFinancialSnapshot = ({
  member,
  activeLoansCount = 0,
  onRequestLoan,
  onRepay,
}) => {
  const [valuesVisible, setValuesVisible] = useState(false);

  const data = useMemo(() => {
    const currentBalance = member?.currentBalance || 0;
    const savingBalance = member?.savingBalance || 0;
    const shareBalance = member?.shareBalance || 0;
    const totalBalance = currentBalance + savingBalance + shareBalance;

    const totalInvested = member?.totalInvested || 0;
    const totalSavingProfit = member?.totalSavingProfit || 0;
    const creditLimit = member?.creditLimit || 0;

    const loan = member?.activeLoan;
    const remaining = loan?.remainingAmount || 0;
    const loanTotal = loan?.totalAmount || 0;
    const paid = loan?.paidAmount || 0;
    const repaidPct =
      loanTotal > 0 ? Math.min(100, Math.round((paid / loanTotal) * 100)) : 0;

    const creditAvailable = Math.max(0, creditLimit - remaining);

    const cs = member?.creditScore;
    const score = cs?.score ?? 550;
    const grade = cs?.grade ?? 'Fair';
    const topFactor = cs?.factors?.[0] || null;

    const segments = [
      { ...SEGMENTS[0], value: currentBalance },
      { ...SEGMENTS[1], value: savingBalance },
      { ...SEGMENTS[2], value: shareBalance },
    ];

    return {
      totalBalance,
      totalInvested,
      totalSavingProfit,
      creditLimit,
      creditAvailable,
      loan,
      remaining,
      emi: loan?.emi || 0,
      repaidPct,
      score,
      grade,
      topFactor,
      segments,
    };
  }, [member]);

  const fmt = (v) => (valuesVisible ? formatCurrency(v) : MASKED);
  const band = GRADE_BANDS[data.grade] || GRADE_BANDS.Fair;
  // Score normalized into the 300–850 FICO-style range for the mini gauge.
  const scorePct = Math.min(100, Math.max(0, ((data.score - 300) / 550) * 100));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
      {/* ── Primary: Total Balance + split ─────────────────────── */}
      <div className="lg:col-span-5 relative rounded-[2rem] bg-card p-6 sm:p-8 border border-slate-100 dark:border-white/[0.06] shadow-xs flex flex-col">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl  text-white bg-primary">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Total Balance
              </p>
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground/60">
                Across all accounts
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            type="button"
            onClick={() => setValuesVisible((v) => !v)}
            className="p-2 rounded-full hover:bg-muted/50 active:scale-95 transition-all text-muted-foreground/60 hover:text-muted-foreground"
            aria-label={valuesVisible ? 'Hide values' : 'Show values'}
          >
            {valuesVisible ? <Eye size={16} /> : <EyeOff size={16} />}
          </Button>
        </div>

        <div className="mb-6">
          <span className="text-4xl sm:text-5xl font-black tracking-tighter tabular-nums">
            {fmt(data.totalBalance)}
          </span>
        </div>

        {/* Stacked segmented bar */}
        <div className="mt-auto space-y-3">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/20">
            {data.segments.map((seg) => {
              const pct =
                data.totalBalance > 0
                  ? (seg.value / data.totalBalance) * 100
                  : 0;
              if (pct <= 0) return null;
              return (
                <div
                  key={seg.key}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-1000 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: seg.color }}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {data.segments.map((seg) => (
              <div key={seg.key} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  {seg.label}
                </span>
                <span className="text-[11px] font-black tabular-nums text-muted-foreground">
                  {fmt(seg.value)}
                </span>
              </div>
            ))}
          </div>

          {/* Optional value pills */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {data.creditAvailable > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                <Coins size={11} />
                {fmt(data.creditAvailable)} available
              </span>
            )}
            {data.totalSavingProfit > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-600">
                <TrendingUp size={11} />
                {fmt(data.totalSavingProfit)} earned
              </span>
            )}
            {data.totalInvested > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/20 text-[10px] font-bold text-muted-foreground">
                <ArrowDownLeft size={11} />
                {fmt(data.totalInvested)} deposited
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Next Payment / Active Loan ─────────────────────────── */}
      <div className="lg:col-span-4 relative rounded-[2rem] bg-card p-6 sm:p-8 border border-slate-100 dark:border-white/[0.06] shadow-xs flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            {data.loan ? 'Active Loan' : 'Borrowing Power'}
          </p>
          {activeLoansCount > 1 && (
            <span className="px-2.5 py-0.5 rounded-full bg-muted/20 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              {activeLoansCount} active
            </span>
          )}
        </div>

        {data.loan ? (
          <div className="flex flex-col h-full">
            <div className="mb-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                Outstanding
              </p>
              <span className="text-3xl sm:text-4xl font-black tracking-tighter tabular-nums">
                {fmt(data.remaining)}
              </span>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-muted-foreground/60">Repaid</span>
                <span className="tabular-nums text-foreground">
                  {data.repaidPct}%
                </span>
              </div>
              <div className="h-2 w-full bg-muted/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${data.repaidPct}%` }}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                  Monthly Installment
                </p>
                <span className="text-base font-black tabular-nums">
                  {fmt(data.emi)}
                </span>
              </div>
              <Button
                variant="ghost"
                type="button"
                onClick={onRepay}
                className="shrink-0 inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white hover:text-white px-4 py-2 rounded-full font-bold text-[11px] uppercase tracking-widest transition-all hover:-translate-y-0.5"
              >
                Repay
                <ArrowUpRight size={13} strokeWidth={2.5} />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="mb-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                Borrow up to
              </p>
              <span className="text-3xl sm:text-4xl font-black tracking-tighter tabular-nums">
                {fmt(data.creditLimit)}
              </span>
            </div>
            <p className="text-[11px] font-medium text-muted-foreground/70 leading-relaxed mt-3 mb-auto">
              You have no active loans. Apply now and get funds straight into
              your wallet.
            </p>
            <Button
              variant="ghost"
              type="button"
              onClick={onRequestLoan}
              className="mt-4 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-full font-bold text-[12px] transition-all hover:-translate-y-0.5 hover:text-white"
            >
              <Plus size={14} strokeWidth={2.5} />
              New request
            </Button>
          </div>
        )}
      </div>

      {/* ── Credit Score ───────────────────────────────────────── */}
      <div className="lg:col-span-3 relative rounded-[2rem] bg-card p-6 sm:p-8 border border-slate-100 dark:border-white/[0.06] shadow-xs flex flex-col">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl  text-white bg-primary">
            <Shield size={20} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Credit Score
          </p>
        </div>

        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-4xl sm:text-5xl font-black tracking-tighter tabular-nums">
            {data.score}
          </span>
          <span className="text-sm font-bold text-muted-foreground/50">
            /850
          </span>
          {data.score >= 740 && (
            <Sparkles size={14} className="text-primary ml-1" />
          )}
        </div>

        <div className="h-2 w-full bg-muted/20 rounded-full overflow-hidden mb-4">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-1000 ease-out',
              band.dot,
            )}
            style={{ width: `${scorePct}%` }}
          />
        </div>

        <span
          className={cn(
            'inline-flex w-fit items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
            band.bg,
            band.text,
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', band.dot)} />
          {band.label}
        </span>

        {data.topFactor && (
          <p
            className="mt-auto pt-4 text-[11px] font-medium leading-tight text-muted-foreground/70 line-clamp-2"
            title={data.topFactor}
          >
            <span className="font-black uppercase tracking-widest text-[9px] text-muted-foreground/50 block mb-1">
              Top factor
            </span>
            {data.topFactor}
          </p>
        )}
      </div>
    </div>
  );
};

export default MemberFinancialSnapshot;
