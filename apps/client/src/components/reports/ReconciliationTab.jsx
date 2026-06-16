import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Wallet,
  Banknote,
  ArrowRightLeft,
  PiggyBank,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Scale,
  TrendingDown,
  Wrench,
  CalendarDays,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/axios';
import { formatFullCurrency as formatCurrency, cn, capitalize } from '@/lib/utils';
import { toast } from 'sonner';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { subYears, format } from 'date-fns';

const ITEMS_PER_PAGE = 10;

const CHECK_META = {
  memberBalance: {
    icon: Users,
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    resolveEndpoint: '/reports/reconciliation/resolve/member-balance',
  },
  loanLedger: {
    icon: Wallet,
    color: 'indigo',
    gradient: 'from-indigo-500 to-indigo-600',
    resolveEndpoint: '/reports/reconciliation/resolve/loan-ledger',
  },
  cashPosition: {
    icon: Banknote,
    color: 'emerald',
    gradient: 'from-emerald-500 to-emerald-600',
    resolveEndpoint: null, // Cash position is informational — can't auto-fix
  },
  transactionIntegrity: {
    icon: ArrowRightLeft,
    color: 'purple',
    gradient: 'from-purple-500 to-purple-600',
    resolveEndpoint: null, // Orphan transactions need manual review
  },
  savingShareAccounts: {
    icon: PiggyBank,
    color: 'amber',
    gradient: 'from-amber-500 to-amber-600',
    resolveEndpoint: '/reports/reconciliation/resolve/saving-share',
  },
};

const STATUS_PRESENTATION = {
  pass: {
    icon: CheckCircle2,
    label: 'Passed',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  fail: {
    icon: XCircle,
    label: 'Issues Found',
    text: 'text-rose-600 dark:text-rose-400',
  },
  error: {
    icon: AlertTriangle,
    label: 'Error',
    text: 'text-amber-600 dark:text-amber-400',
  },
};

// Flat, audit-style status — a tone-coloured icon + label rather than a filled
// pill, so the reconciliation report reads like a ledger, not a tag cloud.
const StatusBadge = ({ status }) => {
  const s = STATUS_PRESENTATION[status] || STATUS_PRESENTATION.error;
  const Icon = s.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em]',
        s.text,
      )}
    >
      <Icon size={15} strokeWidth={2.5} />
      {s.label}
    </span>
  );
};

// ── Pagination Component ──
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-border/30 bg-muted/5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            currentPage === 1
              ? 'text-muted-foreground/30 cursor-not-allowed'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          )}
        >
          <ChevronLeft size={16} />
        </Button>
        {getPageNumbers().map((page) => (
          <Button
            size="icon"
            key={page}
            variant="ghost"
            onClick={() => onPageChange(page)}
            className={cn(
              'w-8 h-8 rounded-lg text-xs font-black transition-all',
              page === currentPage
                ? 'bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary hover:text-white'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
          >
            {page}
          </Button>
        ))}
        <Button
          variant="ghost"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            currentPage === totalPages
              ? 'text-muted-foreground/30 cursor-not-allowed'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          )}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
};

const CheckCard = ({ checkKey, data, isOpen, onToggle, onResolve, resolving }) => {
  const meta = CHECK_META[checkKey];
  const Icon = meta?.icon || Scale;
  const color = meta?.color || 'blue';
  const hasResolve = !!meta?.resolveEndpoint;
  const status = data.status;

  const [page, setPage] = useState(1);
  const allDiscrepancies = data.discrepancies || [];
  const totalPages = Math.ceil(allDiscrepancies.length / ITEMS_PER_PAGE);
  const paginatedDiscrepancies = useMemo(
    () => allDiscrepancies.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [allDiscrepancies, page],
  );

  // Reset page when data changes
  useEffect(() => {
    setPage(1);
  }, [data]);

  return (
    <Card
      className={cn(
        'border bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-md',
        status === 'pass'
          ? 'border-emerald-500/20'
          : status === 'fail'
            ? 'border-rose-500/25'
            : 'border-amber-500/25',
      )}
    >
      <button type="button" onClick={onToggle} className="w-full text-left">
        <CardHeader className="p-4 sm:p-6 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className={cn(
                  'p-3 rounded-2xl shrink-0 bg-gradient-to-br shadow-lg',
                  meta?.gradient,
                  `shadow-${color}-500/25`,
                )}
              >
                <Icon size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base font-black tracking-tight truncate">
                  {data.label}
                </CardTitle>
                <CardDescription className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mt-0.5 truncate">
                  {data.description}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <StatusBadge status={status} />
              <div
                className={cn(
                  'p-1.5 rounded-xl transition-transform duration-300 bg-muted/50',
                  isOpen ? 'rotate-180' : '',
                )}
              >
                <ChevronDown size={16} className="text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Mini Stats */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Checked
              </span>
              <span className="text-sm font-black">{data.checked}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Matched
              </span>
              <span className="text-sm font-black text-emerald-600">{data.matched}</span>
            </div>
            {allDiscrepancies.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Issues
                </span>
                <span className="text-sm font-black text-rose-600">
                  {allDiscrepancies.length}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
      </button>

      {/* Expandable Detail */}
      <div
        className={cn(
          'transition-all duration-500 ease-in-out overflow-hidden',
          isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <CardContent className="p-0 border-t border-border/30">
          {status === 'pass' ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                All records reconciled successfully
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.checked} {data.checked === 1 ? 'record' : 'records'} checked — zero
                discrepancies
              </p>
            </div>
          ) : paginatedDiscrepancies.length > 0 ? (
            <>
              {/* Resolve Button Bar */}
              {hasResolve && allDiscrepancies.length > 0 && (
                <div className="flex items-center justify-between px-6 py-3 bg-amber-500/5 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                      {allDiscrepancies.length} discrepancies can be auto-resolved
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResolve(checkKey);
                    }}
                    disabled={resolving}
                    className="rounded-full text-[10px] font-black uppercase tracking-widest px-4 gap-2 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50"
                  >
                    {resolving ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Wrench size={12} />
                    )}
                    Resolve All
                  </Button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/30 border-b border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground font-black">
                    <tr>
                      <th className="px-6 py-3">Entity</th>
                      {checkKey === 'transactionIntegrity' && (
                        <th className="px-6 py-3">Type</th>
                      )}
                      {checkKey === 'savingShareAccounts' && (
                        <th className="px-6 py-3">Account</th>
                      )}
                      <th className="px-6 py-3 text-right">Expected</th>
                      <th className="px-6 py-3 text-right">Actual</th>
                      <th className="px-6 py-3 text-right">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {paginatedDiscrepancies.map((d, idx) => (
                      <DiscrepancyRow key={idx} d={d} checkKey={checkKey} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          ) : data.error ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-sm font-bold text-amber-600">{data.error}</p>
            </div>
          ) : null}

          {/* Transaction Integrity extras */}
          {checkKey === 'transactionIntegrity' && data.totalTransactions > 0 && (
            <div className="flex flex-wrap items-center gap-4 p-4 sm:px-6 border-t border-border/30 bg-muted/10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Total Txns:{' '}
                <span className="text-foreground font-black text-xs">
                  {data.totalTransactions}
                </span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Linked:{' '}
                <span className="text-emerald-600 font-black text-xs">
                  {data.linkedTransactions}
                </span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Unlinked:{' '}
                <span className="text-amber-600 font-black text-xs">
                  {data.unlinkedTransactions}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
};

const DiscrepancyRow = ({ d, checkKey }) => {
  let entityName = '';
  let entitySub = '';

  if (checkKey === 'memberBalance' || checkKey === 'savingShareAccounts') {
    entityName = capitalize(d.memberName || 'Unknown');
    entitySub = d.memberId ? `ID: ${String(d.memberId).slice(-6)}` : '';
  } else if (checkKey === 'loanLedger') {
    entityName = capitalize(d.customerName || 'Unknown');
    entitySub = d.description || (d.loanId ? `Loan: ${String(d.loanId).slice(-6)}` : '');
  } else if (checkKey === 'cashPosition') {
    entityName = d.branchName || 'Unknown Branch';
    entitySub = d.branchCode || d.description || '';
  } else if (checkKey === 'transactionIntegrity') {
    entityName = d.referenceModel || 'Transaction';
    entitySub = d.description || '';
  }

  const diff = d.diff ?? d.amount ?? 0;

  return (
    <tr className="hover:bg-muted/10 transition-colors">
      <td className="px-6 py-3">
        <div>
          <span className="font-bold text-sm">{entityName}</span>
          {entitySub && (
            <span className="block text-[10px] text-muted-foreground font-medium mt-0.5">
              {entitySub}
            </span>
          )}
        </div>
      </td>
      {checkKey === 'transactionIntegrity' && (
        <td className="px-6 py-3">
          <span
            className={cn(
              'inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider',
              d.type === 'orphan'
                ? 'bg-rose-500/10 text-rose-600'
                : 'bg-amber-500/10 text-amber-600',
            )}
          >
            {d.type === 'orphan' ? 'Orphan' : 'Mismatch'}
          </span>
        </td>
      )}
      {checkKey === 'savingShareAccounts' && (
        <td className="px-6 py-3">
          <span
            className={cn(
              'inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider',
              d.accountType === 'saving'
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-blue-500/10 text-blue-600',
            )}
          >
            {d.accountType === 'saving' ? 'Saving' : 'Share'}
          </span>
        </td>
      )}
      <td className="px-6 py-3 text-right tabular-nums text-sm font-medium">
        {d.expected != null ? formatCurrency(d.expected) : '—'}
      </td>
      <td className="px-6 py-3 text-right tabular-nums text-sm font-medium">
        {d.actual != null ? formatCurrency(d.actual) : '—'}
      </td>
      <td className="px-6 py-3 text-right">
        <span
          className={cn(
            'tabular-nums text-sm font-black',
            diff > 0 ? 'text-emerald-600' : 'text-rose-600',
          )}
        >
          {diff > 0 ? '+' : ''}
          {formatCurrency(diff)}
        </span>
      </td>
    </tr>
  );
};

const ReconciliationTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openChecks, setOpenChecks] = useState({});
  const [resolving, setResolving] = useState({});
  const [dateRange, setDateRange] = useState({
    from: subYears(new Date(), 1),
    to: new Date(),
  });

  const fetchReconciliation = async (range) => {
    try {
      setLoading(true);
      const params = {};
      const currentRange = range !== undefined ? range : dateRange;
      
      if (currentRange?.from) {
        params.startDate = format(currentRange.from, 'yyyy-MM-dd');
      }
      if (currentRange?.to) {
        params.endDate = format(currentRange.to, 'yyyy-MM-dd');
      }
      
      const { data: result } = await api.get('/reports/reconciliation', { params });
      setData(result);

      // Auto-open failed checks
      const autoOpen = {};
      [
        'memberBalance',
        'loanLedger',
        'cashPosition',
        'transactionIntegrity',
        'savingShareAccounts',
      ].forEach((key) => {
        if (result[key]?.status === 'fail') autoOpen[key] = true;
      });
      setOpenChecks(autoOpen);
    } catch (error) {
      console.error('Failed to fetch reconciliation:', error);
      toast.error('Failed to run reconciliation engine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliation();
  }, []);

  const toggleCheck = (key) => {
    setOpenChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleResolve = async (checkKey) => {
    const meta = CHECK_META[checkKey];
    if (!meta?.resolveEndpoint) return;

    try {
      setResolving((prev) => ({ ...prev, [checkKey]: true }));
      const { data: result } = await api.post(meta.resolveEndpoint);
      toast.success(result.message || `Resolved ${result.fixed} discrepancies`);

      // Re-run reconciliation to show updated results
      await fetchReconciliation();
    } catch (error) {
      console.error('Resolve failed:', error);
      toast.error(error.response?.data?.message || 'Failed to resolve discrepancies');
    } finally {
      setResolving((prev) => ({ ...prev, [checkKey]: false }));
    }
  };

  const handleClearDates = () => {
    const defaultRange = {
      from: subYears(new Date(), 1),
      to: new Date(),
    };
    setDateRange(defaultRange);
    fetchReconciliation(defaultRange);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <Skeleton className="h-8 w-64 rounded-xl mx-auto sm:mx-0" />
                <Skeleton className="h-4 w-48 rounded-lg mx-auto sm:mx-0" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-24 rounded-xl" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        {[0, 1, 2, 3, 4].map((i) => (
          <Card
            key={i}
            className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden"
          >
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40 rounded-lg" />
                  <Skeleton className="h-3 w-64 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data;
  const allPassed = summary.failed === 0;

  const checkKeys = [
    'memberBalance',
    'loanLedger',
    'cashPosition',
    'transactionIntegrity',
    'savingShareAccounts',
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      {/* ══════ HEALTH DASHBOARD ══════ */}
      <Card
        className={cn(
          'border shadow-sm rounded-[2rem] overflow-hidden transition-all duration-500',
          allPassed
            ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-600/5'
            : 'border-rose-500/30 bg-gradient-to-br from-rose-500/5 to-amber-500/5',
        )}
      >
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center shrink-0 shadow-xl',
                allPassed
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30'
                  : 'bg-gradient-to-br from-rose-500 to-amber-500 shadow-rose-500/30',
              )}
            >
              {allPassed ? (
                <ShieldCheck className="w-10 h-10 text-white" />
              ) : (
                <AlertTriangle className="w-10 h-10 text-white" />
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-black tracking-tight">
                {allPassed ? (
                  <>
                    All Systems{' '}
                    <span className="text-emerald-600 dark:text-emerald-400">Reconciled</span>
                  </>
                ) : (
                  <>
                    <span className="text-rose-600 dark:text-rose-400">
                      {summary.totalDiscrepancies}
                    </span>{' '}
                    {summary.totalDiscrepancies === 1 ? 'Discrepancy' : 'Discrepancies'}{' '}
                    Detected
                  </>
                )}
              </h2>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                Reconciliation completed at {new Date(data.generatedAt).toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 shrink-0">
              <div className="text-center p-3 rounded-2xl bg-background/60 border border-border/40">
                <div className="text-2xl font-black text-emerald-600">{summary.passed}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mt-0.5">
                  Passed
                </div>
              </div>
              <div className="text-center p-3 rounded-2xl bg-background/60 border border-border/40">
                <div className="text-2xl font-black text-rose-600">{summary.failed}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mt-0.5">
                  Failed
                </div>
              </div>
              <div className="text-center p-3 rounded-2xl bg-background/60 border border-border/40">
                <div className="text-2xl font-black text-foreground">{summary.totalChecks}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mt-0.5">
                  Total
                </div>
              </div>
            </div>
          </div>

          {summary.totalDiscrepancyAmount > 0 && (
            <div className="mt-5 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/15 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <TrendingDown size={18} className="text-rose-500 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    Total Discrepancy Amount
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-2">
                    (absolute sum across all checks)
                  </span>
                </div>
              </div>
              <span className="text-lg font-black tabular-nums text-rose-600 dark:text-rose-400">
                {formatCurrency(summary.totalDiscrepancyAmount)}
              </span>
            </div>
          )}

          {/* ── Date Range Picker ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-5 p-4 rounded-2xl bg-muted/20 border border-border/30">
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
              <CalendarDays size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Reconciliation Period</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <DateRangePicker 
                date={dateRange} 
                setDate={(newDate) => {
                  setDateRange(newDate);
                }} 
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchReconciliation()}
                disabled={loading}
                className="rounded-full text-[10px] font-black uppercase tracking-widest px-5 h-12 gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all shadow-sm"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Apply Filter
              </Button>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReconciliation}
              disabled={loading}
              className="rounded-full text-[10px] font-black uppercase tracking-widest px-5 gap-2"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Re-run Checks
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ══════ CHECK CARDS ══════ */}
      {checkKeys.map((key) => {
        const checkData = data[key];
        if (!checkData) return null;
        return (
          <CheckCard
            key={key}
            checkKey={key}
            data={checkData}
            isOpen={!!openChecks[key]}
            onToggle={() => toggleCheck(key)}
            onResolve={handleResolve}
            resolving={!!resolving[key]}
          />
        );
      })}
    </div>
  );
};

export default ReconciliationTab;
