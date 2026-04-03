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
  toTitleCase,
  renderPdfSignatures,
} from '@/lib/pdfExportUtils';
import Tooltip from '@/components/ui/Tooltip';
import Pagination from '@/components/ui/Pagination';
import { MemberTransactionsSkeleton } from '@/components/ui/PageSkeletons';
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
      const doc = new jsPDF();

      const startY = await renderPdfHeader(doc, {
        businessContext: ctx,
        title: 'Financial Activity Statement',
        leftDetails: [
          {
            label: 'Account Holder',
            value: toTitleCase(member?.name || 'Valued Member'),
          },
          {
            label: 'Member ID',
            value:
              member?.memberId || member?._id?.slice(-6).toUpperCase() || 'N/A',
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
        const isOutflow =
          item.type === 'withdrawal' || item.category === 'repayment';
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

      doc.save(`Activity_Report_${new Date().getTime()}.pdf`);
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
    const isCredit = [
      'deposit',
      'transfer_receive',
      'external_receive',
    ].includes(type);

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

      <div className="bg-card rounded-[2.5rem] border border-border/50 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-10 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
              <div className="relative flex-1 w-full max-w-md">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={18}
                />
                <Input
                  placeholder="Search transactions..."
                  className="pl-12 rounded-2xl h-12 bg-background border-none shadow-sm focus-visible:ring-primary/20 w-full"
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

            <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide w-full sm:w-auto flex-wrap sm:flex-nowrap">
              {['ALL', 'INVESTMENT', 'PROFIT', 'REPAYMENT', 'GOAL'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f.toLowerCase())}
                  className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    filter === f.toLowerCase()
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {f}
                </button>
              ))}
              <div className="h-6 w-[1px] bg-border/50 mx-1 hidden md:block" />
              <Button
                onClick={() => {
                  setReportDateRange(dateRange);
                  setIsExportModalOpen(true);
                }}
                variant="outline"
                size="sm"
                className="rounded-full gap-2 text-[10px] font-black uppercase tracking-widest px-4 h-9 border-primary/20 hover:bg-primary/5 text-primary whitespace-nowrap w-full sm:w-auto"
              >
                <Download size={14} />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border/40">
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
                  <MemberActivityCard key={item._id} activity={item} />
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
                className="p-6 sm:p-8 hover:bg-muted/30 transition-all flex items-center justify-between group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 min-w-0">
                  <div className="p-4 rounded-2xl bg-background border border-border/50 shadow-sm group-hover:scale-110 transition-transform shrink-0 self-start sm:self-auto">
                    {getItemStyle(item.category, item.type).icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-lg tracking-tight capitalize flex flex-wrap items-center gap-2">
                      {item.description}
                      {item.status && (
                        <div
                          className={cn(
                            'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md flex items-center gap-1.5 border leading-none transition-all',
                            item.status === 'Completed' &&
                              'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
                            item.status === 'Pending' &&
                              'bg-amber-500/10 text-amber-600 border-amber-500/20',
                            item.status === 'Failed' &&
                              'bg-rose-500/10 text-rose-600 border-rose-500/20',
                          )}
                        >
                          <span
                            className={cn(
                              'w-1 h-1 rounded-full',
                              item.status === 'Completed' && 'bg-emerald-500',
                              item.status === 'Pending' &&
                                'bg-amber-500 animate-pulse',
                              item.status === 'Failed' && 'bg-rose-500',
                            )}
                          />
                          {item.status}
                        </div>
                      )}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2 sm:mt-1">
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest">
                        {item.category}
                      </p>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
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
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                            {item.type === 'transfer_receive' ? (
                              <>
                                <ArrowDownLeft
                                  size={10}
                                  className="text-emerald-500"
                                />
                                From:{' '}
                                <span className="text-foreground capitalize">
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
                                To:{' '}
                                <span className="text-foreground capitalize">
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

                <div className="flex items-center gap-4 shrink-0 sm:mt-0">
                  <div className="text-right">
                    <p
                      className={`text-xl font-black tracking-tighter ${getItemStyle(item.category, item.type).color}`}
                    >
                      {getItemStyle(item.category, item.type).sign}
                      {formatCurrency(item.amount)}
                    </p>
                    {item.metadata?.balanceAfter && (
                      <p className="text-[10px] font-bold text-muted-foreground/60 mt-0.5">
                        Bal: {formatCurrency(item.metadata.balanceAfter)}
                      </p>
                    )}
                  </div>
                  {(item.category === 'repayment' ||
                    item.category === 'goal') && (
                    <Tooltip content="Export Statement">
                      <button
                        onClick={() => {
                          exportLoanStatement(
                            {
                              ...item,
                              principal: item.amount,
                              totalAmount: item.amount,
                              status: 'confirmed',
                              customer: member,
                            },
                            [],
                            member,
                          );
                        }}
                        className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all active:scale-95 opacity-0 group-hover:opacity-100"
                      >
                        <Download size={16} />
                      </button>
                    </Tooltip>
                  )}
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
                    className="w-full"
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
              className="flex-1 rounded-[1.25rem] h-14 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              disabled={isExportingModal}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExportPDF}
              className="flex-1 rounded-[1.25rem] h-14 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20"
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
