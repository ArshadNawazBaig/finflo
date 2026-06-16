import { useState, useEffect, useCallback, useRef } from 'react';
import {
  History,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  Target,
  FileText,
  Calendar,
  Download,
  TrendingUp,
} from 'lucide-react';
import { subMonths, startOfDay, endOfDay } from 'date-fns';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StatsCard from '@/components/StatsCard';
import PageHeader from '@/components/PageHeader';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { isCreditType } from '@/lib/transactionDirection';
import { toast } from 'sonner';
import EmptyState from '@/components/ui/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import {
  renderPdfHeader,
  renderPdfFooter,
  getBusinessContext,
  getMemberContext,
  toTitleCase,
  renderPdfSignatures,
  generateTransactionReceipt,
} from '@/lib/pdfExportUtils';
import Tooltip from '@/components/ui/Tooltip';
import Pagination from '@/components/ui/Pagination';
import { MemberTransactionsSkeleton, MemberActivityPageSkeleton } from '@/components/ui/PageSkeletons';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import MemberActivityCard from '@/components/member/MemberActivityCard';
import InfiniteLoader from '@/components/InfiniteLoader';
import { cn } from '@/lib/utils';

const MemberTransactions = () => {
  const [activity, setActivity] = useState([]);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // Pagination & Mobile State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [limit, setLimit] = useState(DESKTOP_PAGE_LIMIT);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [summary, setSummary] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
  });
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });

  // Export Modal States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingModal, setIsExportingModal] = useState(false);
  const [reportDateRange, setReportDateRange] = useState({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });

  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
  }, [isMobile]);
  const observerTarget = useRef(null);
  const skipNextEffect = useRef(false);

  // Fetch all-time summary once on mount (not affected by filters)
  const fetchSummary = useCallback(async () => {
    try {
      const memberToken = localStorage.getItem('member');
      if (!memberToken) return;
      const res = await api.get('/members/portal/activity', {
        params: { page: 1, limit: 1 }, // summary comes from backend regardless of limit
        headers: {
          /* Auth header handled by browser cookies */
        },
      });
      if (res.data.summary) setSummary(res.data.summary);
    } catch (e) {
      // silently fail, summary is non-critical
    }
  }, []);

  const fetchActivity = useCallback(
    async (pageToFetch = 1, isAppend = false) => {
      try {
        if (isAppend) {
          setIsFetchingMore(true);
        } else {
          setLoading(true);
        }

        const memberToken = localStorage.getItem('member');

        if (!memberToken) {
          throw new Error('Not authenticated');
        }

        const [activityRes, memberRes] = await Promise.all([
          api.get('/members/portal/activity', {
            params: {
              page: pageToFetch,
              limit,
              category: filter === 'all' ? '' : filter,
              search,
              startDate: dateRange?.from?.toISOString(),
              endDate: dateRange?.to?.toISOString(),
            },
            headers: {
              /* Auth header handled by browser cookies */
            },
          }),
          api.get('/member-auth/me', {
            headers: {
              /* Auth header handled by browser cookies */
            },
          }),
        ]);

        const newActivity = activityRes.data.data || [];

        if (isAppend) {
          setActivity((prev) => {
            const existingIds = new Set(prev.map((a) => a._id));
            const filtered = newActivity.filter((a) => !existingIds.has(a._id));
            return [...prev, ...filtered];
          });
        } else {
          setActivity(newActivity);
        }

        setMember(memberRes.data);
        setTotalPages(activityRes.data.totalPages || 0);
        setTotalEntries(activityRes.data.totalEntries || 0);
        if (isAppend) {
          skipNextEffect.current = true;
        }
        setCurrentPage(pageToFetch);
      } catch (error) {
        console.error('Failed to fetch activity:', error);
        toast.error('Failed to load transaction history');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [filter, search, limit, dateRange],
  );

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchActivity(1, false);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [filter, search, limit, dateRange]);

  // Fetch all-time summary once on mount
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (!observerTarget.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          !loading &&
          currentPage < totalPages
        ) {
          fetchActivity(currentPage + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: '100px' },
    );
    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isFetchingMore, loading, currentPage, totalPages, fetchActivity]);

  const handleExportPDF = async () => {
    try {
      setIsExportingModal(true);

      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const {
        renderPdfHeader,
        renderPdfFooter,
        getBusinessContext,
        toTitleCase,
        renderPdfSignatures,
      } = await import('@/lib/pdfExportUtils');

      // Fetch ALL transactions for the selected range (ignoring pagination)
      const { data } = await api.get('/members/portal/activity', {
        params: {
          page: 1,
          limit: 1000, // Fetch up to 1000 records for the report
          startDate: startOfDay(reportDateRange.from).toISOString(),
          endDate: endOfDay(reportDateRange.to).toISOString(),
        },
      });

      const reportData = data.data || [];
      if (!reportData.length) {
        toast.error('No transactions found in this date range');
        return;
      }

      const ctx = getBusinessContext();
      const mCtx = getMemberContext(member);
      const doc = new jsPDF();

      const startY = await renderPdfHeader(doc, {
        businessContext: ctx,
        title: 'Financial Activity Statement',
        leftDetails: [
          {
            label: 'Account Holder',
            value: toTitleCase(mCtx.name || 'Valued Member'),
          },
          {
            label: 'Member ID',
            value: mCtx.memberId || '\u2014',
          },
        ],
        rightDetails: [
          { label: 'Statement Date', value: new Date().toLocaleDateString() },
          {
            label: 'Report Period',
            value: `${reportDateRange.from.toLocaleDateString()} - ${reportDateRange.to.toLocaleDateString()}`,
          },
          { label: 'Total Records', value: reportData.length.toString() },
        ],
      });

      const tableColumn = ['Date', 'Description', 'Category', 'Amount', 'Type'];
      const tableRows = reportData.map((item) => {
        const isOutflow = !isCreditType(item.type);
        return [
          new Date(item.date).toLocaleDateString(),
          item.description,
          item.category.toUpperCase(),
          `${isOutflow ? '-' : ''}${formatCurrency(item.amount)}`,
          item.type.toUpperCase(),
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY,
        theme: 'grid',
        headStyles: {
          fillColor: [64, 53, 100],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          3: { halign: 'right' },
        },
        alternateRowStyles: { fillColor: [250, 250, 255] },
        margin: { left: 14, right: 14 },
      });

      const finalY = doc.lastAutoTable?.finalY || startY + 20;
      await renderPdfSignatures(doc, { startY: finalY, businessContext: ctx });

      renderPdfFooter(doc, { businessContext: ctx });

      const { savePdf } = await import('@/lib/nativeDownload');
      await savePdf(doc, `Activity_Report_${new Date().getTime()}.pdf`);
      toast.success('Report downloaded successfully');
      setIsExportModalOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsExportingModal(false);
    }
  };

  // Filtering and searching are now handled on the backend
  const displayActivity = activity;

  const getItemStyle = (category, type) => {
    const isCredit = isCreditType(type);

    if (category === 'profit')
      return {
        color: 'text-emerald-600',
        sign: '+',
        icon: <PieChart className="text-emerald-500" size={18} />,
      };
    if (category === 'goal')
      return {
        color: 'text-indigo-600',
        sign: '-',
        icon: <Target className="text-indigo-500" size={18} />,
      };
    if (category === 'repayment')
      return {
        color: 'text-amber-600',
        sign: '-',
        icon: <FileText className="text-amber-500" size={18} />,
      };

    if (isCredit) {
      return {
        color: category === 'investment' ? 'text-primary' : 'text-emerald-600',
        sign: '+',
        icon:
          category === 'investment' ? (
            <TrendingUp className="text-primary" size={18} />
          ) : (
            <ArrowUpRight className="text-emerald-500" size={18} />
          ),
      };
    } else {
      return {
        color: 'text-rose-600',
        sign: '-',
        icon: <ArrowDownLeft className="text-rose-500" size={18} />,
      };
    }
  };

  if (loading && activity.length === 0 && !member) {
    return <MemberActivityPageSkeleton />;
  }

  return (
    <div className="w-full max-w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20 overflow-visible">
      <PageHeader
        title="Activity Ledger"
        description="Every movement of your funds, recorded with absolute transparency."
      />

      {/* Summary Cards */}
      {loading && (!member || !summary.totalDeposits) ? (
        <CardsSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-hidden">
          <StatsCard
            title="Total Inflow"
            amount={formatCurrency(summary.totalDeposits)}
            icon={<ArrowUpRight size={20} />}
            color="bg-emerald-500 shadow-emerald-500/20"
            subtitle="Investments, profits & received transfers"
          />

          <StatsCard
            title="Total Outflow"
            amount={formatCurrency(summary.totalWithdrawals)}
            icon={<ArrowDownLeft size={20} />}
            color="bg-rose-500 shadow-rose-500/20"
            subtitle="Withdrawals, transfers & repayments"
          />

          <StatsCard
            title="Portfolio Balance"
            amount={formatCurrency(member?.currentBalance ?? 0)}
            icon={<TrendingUp size={20} />}
            color={
              member?.currentBalance < 0
                ? 'bg-rose-500 shadow-rose-500/20'
                : 'bg-primary shadow-primary/20'
            }
            subtitle="Available investment portfolio balance"
            badge={member?.currentBalance < 0 ? 'Negative' : 'Active'}
            badgeTooltip={
              member?.currentBalance < 0
                ? 'Your balance is currently in arrears'
                : 'Your portfolio is currently active'
            }
          />
        </div>
      )}

      <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
              <div className="relative flex-1 w-full max-w-md">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <Input
                  placeholder="Search transactions..."
                  className="pl-11 rounded-full h-11 bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] focus-visible:ring-primary/20 w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <DateRangePicker
                date={dateRange}
                setDate={setDateRange}
                className="w-full sm:w-auto"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide w-full sm:w-auto flex-wrap sm:flex-nowrap">
              {['ALL', 'INVESTMENT', 'PROFIT', 'REPAYMENT', 'GOAL'].map((f) => (
                <Button
                  variant="ghost"
                  key={f}
                  onClick={() => setFilter(f.toLowerCase())}
                  className={cn(
                    'px-4 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-[0.15em] transition-all whitespace-nowrap',
                    filter === f.toLowerCase()
                      ? 'bg-primary text-white shadow-[0_8px_24px_-8px_rgba(99,102,241,0.5)]'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04]',
                  )}
                >
                  {f}
                </Button>
              ))}
              <div className="h-6 w-[1px] bg-slate-100 dark:bg-white/[0.06] mx-1 hidden md:block" />
              <Button
                onClick={() => {
                  setReportDateRange(dateRange);
                  setIsExportModalOpen(true);
                }}
                size="sm"
                className="rounded-full gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] px-4 min-h-9 bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 whitespace-nowrap w-full sm:w-auto"
              >
                <Download size={12} strokeWidth={2.5} />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
          {loading ? (
            <MemberTransactionsSkeleton count={6} />
          ) : displayActivity.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={History}
                title="No Transactions Found"
                description="Your transaction ledger is currently empty or matches no filters."
              />
            </div>
          ) : isMobile ? (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {displayActivity.map((item) => (
                  <MemberActivityCard
                    key={item._id}
                    activity={item}
                    member={member}
                  />
                ))}
              </div>

              {/* Infinite Scroll Trigger */}
              {currentPage < totalPages && (
                <div ref={observerTarget} className="py-4">
                  <InfiniteLoader isFetchingMore={isFetchingMore} />
                </div>
              )}
            </div>
          ) : (
            displayActivity.map((item) => (
              <div
                key={item._id}
                className="p-5 sm:p-6 hover:bg-slate-50/40 dark:hover:bg-white/[0.02] transition-all flex items-center justify-between group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 dark:bg-white/[0.04] shrink-0 self-start sm:self-auto [&_svg]:w-3.5 [&_svg]:h-3.5">
                    {getItemStyle(item.category, item.type).icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-sm tracking-[-0.02em] capitalize text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                      {item.description}
                      {item.status && (
                        <span
                          className={cn(
                            'text-[9px] font-extrabold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full leading-none',
                            item.status === 'Completed' &&
                              'bg-emerald-500/10 text-emerald-600',
                            item.status === 'Pending' &&
                              'bg-amber-500/10 text-amber-600',
                            item.status === 'Failed' &&
                              'bg-rose-500/10 text-rose-600',
                          )}
                        >
                          {item.status}
                        </span>
                      )}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                      <p className="text-[10px] font-extrabold uppercase text-primary tracking-[0.12em]">
                        {item.category}
                      </p>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/[0.12]" />
                      <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        <Calendar size={10} />
                        {new Date(item.date).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>

                      {/* Sender/Recipient Details */}
                      {(item.type === 'transfer_receive' ||
                        item.type === 'transfer_send') && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/[0.12]" />
                          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            {item.type === 'transfer_receive' ? (
                              <>
                                <ArrowDownLeft
                                  size={10}
                                  className="text-emerald-500"
                                />
                                From{' '}
                                <span className="font-extrabold text-slate-700 dark:text-slate-300 capitalize">
                                  {item.metadata?.senderName ||
                                    item.description?.replace(
                                      /transfer from /i,
                                      '',
                                    )}
                                </span>
                              </>
                            ) : (
                              <>
                                <ArrowUpRight
                                  size={10}
                                  className="text-rose-500"
                                />
                                To{' '}
                                <span className="font-extrabold text-slate-700 dark:text-slate-300 capitalize">
                                  {item.metadata?.recipientName ||
                                    item.description?.replace(
                                      /transfer to /i,
                                      '',
                                    )}
                                </span>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 sm:mt-0">
                  <div className="text-right">
                    <p
                      className={cn(
                        'text-base sm:text-lg font-extrabold tracking-tight tabular-nums',
                        getItemStyle(item.category, item.type).color,
                      )}
                    >
                      {getItemStyle(item.category, item.type).sign}
                      {formatCurrency(item.amount)}
                    </p>
                    {item.metadata?.balanceAfter && (
                      <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                        Bal {formatCurrency(item.metadata.balanceAfter)}
                      </p>
                    )}
                  </div>
                  <Tooltip content="Download Receipt">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        generateTransactionReceipt({
                          member,
                          type: item.type,
                          amount: item.amount,
                          description: item.description,
                          date: item.date,
                          balanceAfter: item.metadata?.balanceAfter,
                          referenceId: item._id,
                          accountType: 'current',
                        })
                      }
                      className="h-8 w-8 flex items-center justify-center bg-primary/10 text-primary rounded-full hover:bg-primary hover:text-white transition-all active:scale-95 opacity-0 group-hover:opacity-100 [&_svg]:w-3.5 [&_svg]:h-3.5"
                    >
                      <Download />
                    </Button>
                  </Tooltip>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Pagination */}
        {!isMobile && totalEntries > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages || 1}
            totalEntries={totalEntries}
            limit={limit}
            onPageChange={(page) => fetchActivity(page, false)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setCurrentPage(1);
              fetchActivity(1, false);
            }}
          />
        )}
      </div>

      {/* Export Report Modal */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] !p-0 !gap-0 flex flex-col overflow-hidden rounded-[2.5rem] border-border/50 shadow-2xl bg-background">
          {/* Fixed Header */}
          <div className="p-8 border-b bg-background z-10 shrink-0 relative">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Download size={24} />
              </div>
              <div className="text-left">
                <DialogTitle className="text-2xl font-black tracking-tight">
                  Export Statement
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground/80 mt-1">
                  Select the date range for your transaction report.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-900/10">
            <div className="space-y-6">
              <div className="">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 block text-center">
                  Select Report Period
                </label>
                <div className="flex justify-center">
                  <DateRangePicker
                    date={reportDateRange}
                    setDate={setReportDateRange}
                    className=""
                  />
                </div>
                <p className="text-[9px] text-center text-muted-foreground mt-4 leading-relaxed font-medium">
                  Note: Generating reports for long periods may take a few
                  moments.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 border-t bg-background shrink-0 flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              onClick={() => setIsExportModalOpen(false)}
              className="flex-1 rounded-[1.25rem] min-h-14 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              disabled={isExportingModal}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExportPDF}
              className="flex-1 rounded-[1.25rem] min-h-14 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20"
              disabled={isExportingModal}
            >
              {isExportingModal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  Generating...
                </>
              ) : (
                'Generate PDF'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberTransactions;
