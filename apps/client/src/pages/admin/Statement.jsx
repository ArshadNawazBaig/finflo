import { useState, useEffect, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import {
  TrendingUp,
  Coins,
  Hash,
  Wallet,
  ArrowDownLeft,
  Download,
  Loader2,
  RefreshCcw,
} from 'lucide-react';
import { subYears, startOfDay, endOfDay, format } from 'date-fns';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { TablePageSkeleton } from '@/components/ui/PageSkeletons';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import { formatCurrency, cn, capitalize } from '@/lib/utils';
import { toast } from 'sonner';
import { userAtom } from '@/atoms';
import { exportBusinessStatement } from '@/lib/businessStatementPdfUtils';

const Statement = () => {
  const user = useAtomValue(userAtom);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState({
    data: [],
    summary: { totalIncome: 0, feeIncome: 0, nonFeeIncome: 0, transactionCount: 0 },
    categories: [],
    totalEntries: 0,
    totalPages: 1,
    currentPage: 1,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subYears(new Date(), 1)),
    to: endOfDay(new Date()),
  });

  const fetchStatement = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (dateRange?.from) params.set('startDate', dateRange.from.toISOString());
      if (dateRange?.to) params.set('endDate', dateRange.to.toISOString());
      const { data: res } = await api.get(
        `/ledger/business-statement?${params.toString()}`,
      );
      setData(res);
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to load business statement.',
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, dateRange]);

  useEffect(() => {
    fetchStatement();
  }, [fetchStatement]);

  // Reset to page 1 whenever the user changes the date range.
  useEffect(() => {
    setPage(1);
  }, [dateRange?.from, dateRange?.to]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const { data: res } = await api.post('/ledger/sync-fee-income');
      const total = res?.result?.totalCreated || 0;
      toast.success(
        total > 0
          ? `Synced ${total} historical fee transaction${total === 1 ? '' : 's'}.`
          : 'No missing fee transactions — everything is already on the books.',
      );
      // Re-fetch so the table reflects the new rows.
      await fetchStatement();
    } catch (err) {
      console.error('Sync fees error:', err);
      toast.error(
        err.response?.data?.message || 'Failed to sync fee transactions.',
      );
    } finally {
      setSyncing(false);
    }
  }, [fetchStatement]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      // Pull the full set (not just the current page) so the PDF is complete.
      const params = new URLSearchParams({ page: '1', limit: '10000' });
      if (dateRange?.from) params.set('startDate', dateRange.from.toISOString());
      if (dateRange?.to) params.set('endDate', dateRange.to.toISOString());
      const { data: res } = await api.get(
        `/ledger/business-statement?${params.toString()}`,
      );
      await exportBusinessStatement({
        summary: res.summary,
        categories: res.categories,
        transactions: res.data || [],
        dateRange,
        userName: user?.name || 'Admin',
      });
      toast.success('Statement downloaded.');
    } catch (err) {
      console.error('Statement download error:', err);
      toast.error('Failed to download statement.');
    } finally {
      setDownloading(false);
    }
  }, [dateRange, user]);

  if (loading && !data.data.length && data.categories.length === 0) {
    return <TablePageSkeleton />;
  }

  const { summary, categories } = data;
  const topCategory = categories[0];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 max-w-[1400px] mx-auto w-full">
      <PageHeader
        title="Business statement"
        description="Income and fees flowing into the business. Filter by date range to focus on a period."
      />

      {/* Date filter + download */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangePicker
            date={dateRange}
            setDate={(range) => range && setDateRange(range)}
          />
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {dateRange?.from && dateRange?.to && (
              <>
                {format(dateRange.from, 'd MMM yyyy')} →{' '}
                {format(dateRange.to, 'd MMM yyyy')}
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleSync}
            disabled={syncing || loading}
            title="Rebuild any fee income rows that didn't get logged before this code shipped"
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 h-auto bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.08] text-[11px] font-extrabold uppercase tracking-[0.12em] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {syncing ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCcw size={13} strokeWidth={2.5} />
            )}
            {syncing ? 'Syncing…' : 'Sync historical fees'}
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading || loading}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 h-auto bg-primary hover:bg-primary/90 text-white text-[11px] font-extrabold uppercase tracking-[0.12em] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {downloading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Download size={13} strokeWidth={2.5} />
            )}
            {downloading ? 'Preparing…' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Total income"
          amount={formatCurrency(summary.totalIncome)}
          icon={<TrendingUp size={20} />}
          color="bg-emerald-500 shadow-emerald-500/20"
        />
        <StatsCard
          title="Fee income"
          amount={formatCurrency(summary.feeIncome)}
          icon={<Coins size={20} />}
          color="bg-amber-500 shadow-amber-500/20"
        />
        <StatsCard
          title="Non-fee income"
          amount={formatCurrency(summary.nonFeeIncome)}
          icon={<Wallet size={20} />}
          color="bg-indigo-500 shadow-indigo-500/20"
        />
        <StatsCard
          title="Transactions"
          amount={summary.transactionCount.toLocaleString()}
          icon={<Hash size={20} />}
          color="bg-slate-500 shadow-slate-500/20"
        />
      </div>

      {/* Category breakdown */}
      <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] p-6 sm:p-8 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
              Breakdown
            </p>
            <h3 className="text-base font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
              Income by category
            </h3>
          </div>
          {topCategory && (
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Largest: {topCategory.label} ({topCategory.percentage}%)
            </span>
          )}
        </div>

        {categories.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No income yet"
            description="No income transactions in the selected date range."
            className="border-none bg-card/50"
          />
        ) : (
          <div className="space-y-3">
            {categories.map((c) => (
              <div
                key={c.key}
                className="grid grid-cols-[1fr,auto] sm:grid-cols-[1.5fr,3fr,auto,auto] gap-3 items-center p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]"
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-extrabold text-slate-900 dark:text-white truncate">
                    {c.label}
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {c.count} {c.count === 1 ? 'entry' : 'entries'}
                    {c.isFee && (
                      <>
                        {' · '}
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          Fee
                        </span>
                      </>
                    )}
                  </p>
                </div>
                {/* Progress bar — full row on mobile, inline on sm+ */}
                <div className="col-span-2 sm:col-auto h-1.5 w-full bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      c.isFee ? 'bg-amber-500' : 'bg-emerald-500',
                    )}
                    style={{
                      width: `${Math.min(100, Math.max(2, c.percentage))}%`,
                    }}
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                  {c.percentage}%
                </span>
                <span className="text-sm font-extrabold tabular-nums text-slate-900 dark:text-white text-right">
                  {formatCurrency(c.total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions list */}
      <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] p-6 sm:p-8 space-y-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
            Detail
          </p>
          <h3 className="text-base font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
            Income transactions
          </h3>
        </div>

        {data.data.length === 0 ? (
          <EmptyState
            icon={ArrowDownLeft}
            title="Nothing in this range"
            description="Try widening the date filter."
            className="border-none bg-card/50"
          />
        ) : (
          <>
            <div className="space-y-2">
              {data.data.map((t) => (
                <div
                  key={t._id}
                  className="grid grid-cols-[auto,1fr,auto] gap-3 items-center p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]"
                >
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <ArrowDownLeft size={14} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-extrabold text-slate-900 dark:text-white truncate">
                      {t.description ||
                        t.category?.replace(/_/g, ' ') ||
                        'Income'}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                      {format(new Date(t.date), 'd MMM yyyy')}
                      {t.member?.name && (
                        <>
                          {' · '}
                          <span className="capitalize">{capitalize(t.member.name)}</span>
                        </>
                      )}
                      {t.customer?.name && !t.member?.name && (
                        <>
                          {' · '}
                          <span className="capitalize">{capitalize(t.customer.name)}</span>
                        </>
                      )}
                      {' · '}
                      <span className="uppercase tracking-[0.12em] text-[9px] font-extrabold">
                        {t.category?.replace(/_/g, ' ') || 'income'}
                      </span>
                    </p>
                  </div>
                  <span className="text-sm font-extrabold tabular-nums text-emerald-600 shrink-0">
                    +{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>

            {data.totalPages > 1 && (
              <Pagination
                currentPage={data.currentPage}
                totalPages={data.totalPages}
                totalEntries={data.totalEntries}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(l) => {
                  setLimit(l);
                  setPage(1);
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Statement;
