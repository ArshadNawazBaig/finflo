import { cn } from '@/lib/utils';

// Visual language mirrors the loan risk-grade pill in
// components/loans/LoanRequestTable.jsx — `bg-{c}-500/10 text-{c}-600 border-{c}-500/20`.
const BAND_STYLES = {
  Excellent: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Good: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  Fair: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Poor: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Very Poor': 'bg-red-500/10 text-red-600 border-red-500/20',
};

const SIZE_STYLES = {
  sm: 'px-2 py-0.5 text-[9px] gap-1',
  md: 'px-2.5 py-1 text-[10px] gap-1.5',
  lg: 'px-3 py-1.5 text-xs gap-1.5',
};

const CreditScoreBadge = ({ score, band, size = 'md', showScore = false }) => {
  if (!band || score === undefined || score === null) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border font-black uppercase tracking-widest border-border/50 bg-muted/20 text-muted-foreground',
          SIZE_STYLES[size] || SIZE_STYLES.md,
        )}
      >
        Not scored
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-black uppercase tracking-widest',
        BAND_STYLES[band] || BAND_STYLES.Fair,
        SIZE_STYLES[size] || SIZE_STYLES.md,
      )}
    >
      {showScore ? `${band} · ${score}` : band}
    </span>
  );
};

export default CreditScoreBadge;
