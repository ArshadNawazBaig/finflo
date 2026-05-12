import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  DollarSign,
  Percent,
  Clock,
  User,
  Info,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  ArrowUpCircle,
  Download,
  Loader2,
  History,
} from 'lucide-react';
import { subMonths, startOfDay, endOfDay } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import api from '@/lib/axios';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Tooltip from '@/components/ui/Tooltip';
import PageHeader from '@/components/PageHeader';
import { ProfilePageSkeleton } from '@/components/ui/PageSkeletons';
import StatsCard from '@/components/StatsCard';
import DocumentManager from '@/components/customers/DocumentManager';
import InfiniteLoader from '@/components/InfiniteLoader';
import RepaymentCalendar from '@/components/loans/RepaymentCalendar';
import ApprovalActions from '@/components/loans/ApprovalActions';
import AmortizationSchedule from '@/components/loans/AmortizationSchedule';
import CommunicationLogs from '@/components/customers/CommunicationLogs';
import { exportLoanStatement } from '@/lib/pdfExportUtils';
import { useIsMobile } from '@/hooks/useIsMobile';

const LoanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [member, setMember] = useState(null);
  const [allSchedule, setAllSchedule] = useState([]);
  const [displayedSchedule, setDisplayedSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const isMobile = useIsMobile();
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [paidInstallmentsCount, setPaidInstallmentsCount] = useState(0);

  // Pagination State
  const [repaymentPage, setRepaymentPage] = useState(1);
  const [investmentPage, setInvestmentPage] = useState(1);
  const [schedulePage, setSchedulePage] = useState(1);
  const [scheduleLimit, setScheduleLimit] = useState(5);

  const [hasMoreRepayments, setHasMoreRepayments] = useState(true);
  const [hasMoreInvestments, setHasMoreInvestments] = useState(true);
  const [hasMoreSchedule, setHasMoreSchedule] = useState(true);

  const [isFetchingMoreRepayments, setIsFetchingMoreRepayments] =
    useState(false);
  const [isFetchingMoreInvestments, setIsFetchingMoreInvestments] =
    useState(false);
  const [isFetchingMoreSchedule, setIsFetchingMoreSchedule] = useState(false);
  const [isExportingModal, setIsExportingModal] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [reportDateRange, setReportDateRange] = useState({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });

  const itemsPerPage = 3;
  const itemsPerPageScheduleMobile = 2; // As requested

  const repaymentObserverTarget = useRef(null);
  const investmentObserverTarget = useRef(null);
  const scheduleObserverTarget = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const loanRes = await api.get(`/loans/${id}`);
      setLoan(loanRes.data);

      const repaymentsRes = await api.get(`/repayments?loanId=${id}`);
      const allRepayments = repaymentsRes.data.data || [];

      const scheduleRes = await api.get(`/loans/${id}/schedule`);
      const fullSchedule = scheduleRes.data || [];

      // Calculate actual installments paid based on true accumulated principal
      // (Since early payments have less interest, checking total amount undercounts)
      // Filter out reversed repayments for paid calculations
      const activeRepayments = allRepayments.filter(
        (rp) => rp.status !== 'Reversed',
      );
      let currentPrincipalSum = 0;
      let actualInstallmentsPaid = 0;

      const totalAccounted = activeRepayments.reduce(
        (sum, rp) => sum + (rp.principalAmount || 0) + (rp.interestAmount || 0),
        0,
      );
      let principalPaid = activeRepayments.reduce(
        (sum, rp) => sum + (rp.principalAmount || 0),
        0,
      );

      // Legacy fallback
      if (totalAccounted < loanRes.data.paidAmount - 1) {
        const missing = Math.max(0, loanRes.data.paidAmount - totalAccounted);
        const ratio = loanRes.data.principal / (loanRes.data.totalAmount || 1);
        principalPaid += missing * ratio;
      }

      for (let i = 0; i < fullSchedule.length; i++) {
        currentPrincipalSum += fullSchedule[i].principal;
        if (principalPaid >= currentPrincipalSum - 10) {
          actualInstallmentsPaid = i + 1;
        } else {
          break;
        }
      }
      setPaidInstallmentsCount(
        Math.min(actualInstallmentsPaid, loanRes.data.duration),
      );
      if (isMobile) {
        setRepayments(allRepayments.slice(0, itemsPerPage));
        setHasMoreRepayments(allRepayments.length > itemsPerPage);
      } else {
        setRepayments(allRepayments);
      }

      if (loanRes.data.customer?.isMember && loanRes.data.customer?.memberId) {
        const memberId = loanRes.data.customer.memberId;
        const memberRes = await api.get(`/members/${memberId}`);
        setMember(memberRes.data);

        const investmentsRes = await api.get(
          `/investments?memberId=${memberId}`,
        );
        const allInvestments = investmentsRes.data.data || [];
        if (isMobile) {
          setInvestments(allInvestments.slice(0, itemsPerPage));
          setHasMoreInvestments(allInvestments.length > itemsPerPage);
        } else {
          setInvestments(allInvestments);
        }
      }

      const upcomingRes = await api.get(`/loans/upcoming?loanId=${id}`);
      setUpcomingPayments(upcomingRes.data);

      setAllSchedule(fullSchedule);

      if (isMobile) {
        setDisplayedSchedule(fullSchedule.slice(0, itemsPerPageScheduleMobile));
        setHasMoreSchedule(fullSchedule.length > itemsPerPageScheduleMobile);
      } else {
        setDisplayedSchedule(fullSchedule.slice(0, scheduleLimit));
        setHasMoreSchedule(fullSchedule.length > scheduleLimit);
      }

      setRepaymentPage(1);
      setInvestmentPage(1);
      setSchedulePage(1);
    } catch (error) {
      console.error('Failed to fetch loan details', error);
      toast.error('Failed to load loan info');
      navigate('/loans');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, isMobile]);

  const loadMoreRepayments = useCallback(async () => {
    if (isFetchingMoreRepayments || !hasMoreRepayments) return;

    setIsFetchingMoreRepayments(true);
    setTimeout(async () => {
      try {
        const { data } = await api.get(`/repayments?loanId=${id}`);
        const allRP = data.data || [];
        const nextPage = repaymentPage + 1;
        const start = (nextPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const newBatch = allRP.slice(start, end);

        if (newBatch.length > 0) {
          setRepayments((prev) => [...prev, ...newBatch]);
          setRepaymentPage(nextPage);
          setHasMoreRepayments(allRP.length > end);
        } else {
          setHasMoreRepayments(false);
        }
      } catch (error) {
        console.error('Failed to fetch more repayments', error);
      } finally {
        setIsFetchingMoreRepayments(false);
      }
    }, 500);
  }, [id, repaymentPage, hasMoreRepayments, isFetchingMoreRepayments]);

  const loadMoreInvestments = useCallback(async () => {
    if (isFetchingMoreInvestments || !hasMoreInvestments || !member) return;

    setIsFetchingMoreInvestments(true);
    setTimeout(async () => {
      try {
        const memberId = member._id || member;
        const { data } = await api.get(`/investments?memberId=${memberId}`);
        const allInv = data.data || [];
        const nextPage = investmentPage + 1;
        const start = (nextPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const newBatch = allInv.slice(start, end);

        if (newBatch.length > 0) {
          setInvestments((prev) => [...prev, ...newBatch]);
          setInvestmentPage(nextPage);
          setHasMoreInvestments(allInv.length > end);
        } else {
          setHasMoreInvestments(false);
        }
      } catch (error) {
        console.error('Failed to fetch more investments', error);
      } finally {
        setIsFetchingMoreInvestments(false);
      }
    }, 500);
  }, [member, investmentPage, hasMoreInvestments, isFetchingMoreInvestments]);

  const loadMoreSchedule = useCallback(async () => {
    if (isFetchingMoreSchedule || !hasMoreSchedule || !isMobile) return;

    setIsFetchingMoreSchedule(true);
    setTimeout(() => {
      const nextPage = schedulePage + 1;
      const start = (nextPage - 1) * itemsPerPageScheduleMobile;
      const end = start + itemsPerPageScheduleMobile;
      const newBatch = allSchedule.slice(start, end);

      if (newBatch.length > 0) {
        setDisplayedSchedule((prev) => [...prev, ...newBatch]);
        setSchedulePage(nextPage);
        setHasMoreSchedule(allSchedule.length > end);
      } else {
        setHasMoreSchedule(false);
      }
      setIsFetchingMoreSchedule(false);
    }, 500);
  }, [
    allSchedule,
    schedulePage,
    hasMoreSchedule,
    isFetchingMoreSchedule,
    isMobile,
  ]);

  // Handle Desktop Schedule Page Change
  useEffect(() => {
    if (!isMobile) {
      const start = (schedulePage - 1) * scheduleLimit;
      const end = start + scheduleLimit;
      setDisplayedSchedule(allSchedule.slice(start, end));
    }
  }, [schedulePage, scheduleLimit, allSchedule, isMobile]);

  // Infinite Scroll Observers
  useEffect(() => {
    if (!isMobile) return;

    const rpObserver = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMoreRepayments &&
          hasMoreRepayments
        ) {
          loadMoreRepayments();
        }
      },
      { threshold: 1.0 },
    );

    if (repaymentObserverTarget.current) {
      rpObserver.observe(repaymentObserverTarget.current);
    }

    return () => rpObserver.disconnect();
  }, [
    isMobile,
    isFetchingMoreRepayments,
    hasMoreRepayments,
    loadMoreRepayments,
  ]);

  useEffect(() => {
    if (!isMobile) return;

    const invObserver = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMoreInvestments &&
          hasMoreInvestments
        ) {
          loadMoreInvestments();
        }
      },
      { threshold: 1.0 },
    );

    if (investmentObserverTarget.current) {
      invObserver.observe(investmentObserverTarget.current);
    }

    return () => invObserver.disconnect();
  }, [
    isMobile,
    isFetchingMoreInvestments,
    hasMoreInvestments,
    loadMoreInvestments,
  ]);

  useEffect(() => {
    if (!isMobile) return;

    const schObserver = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMoreSchedule &&
          hasMoreSchedule
        ) {
          loadMoreSchedule();
        }
      },
      { threshold: 1.0 },
    );

    if (scheduleObserverTarget.current) {
      schObserver.observe(scheduleObserverTarget.current);
    }

    return () => schObserver.disconnect();
  }, [isMobile, isFetchingMoreSchedule, hasMoreSchedule, loadMoreSchedule]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <ProfilePageSkeleton />;
  if (!loan) return null;

  const netBalance = member ? member.currentBalance || 0 : 0;
  const settlementStatus =
    netBalance >= loan.remainingAmount
      ? 'Full Settlement Possible'
      : 'Partial Settlement Possible';
  const progress = Math.min(
    Math.round((loan.paidAmount / loan.totalAmount) * 100),
    100,
  );

  const handleDownloadStatement = async () => {
    try {
      setIsExportingModal(true);
      const { exportLoanStatement } = await import('@/lib/pdfExportUtils');

      // Filter repayments based on the selected date range
      // Note: We use all available repayments for the loan
      const filteredRepayments = repayments.filter((rp) => {
        const rpDate = new Date(rp.date);
        return (
          rpDate >= startOfDay(reportDateRange.from) &&
          rpDate <= endOfDay(reportDateRange.to)
        );
      });

      await exportLoanStatement(loan, filteredRepayments, member);
      toast.success('Statement downloaded successfully');
      setIsExportModalOpen(false);
    } catch (error) {
      console.error('PDF Export failed:', error);
      toast.error('Failed to generate statement');
    } finally {
      setIsExportingModal(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header Section */}
      <PageHeader
        variant="card"
        icon={ShieldCheck}
        onBack={() => navigate('/loans')}
        title={`Loan #${loan._id.slice(-6).toUpperCase()}`}
        badge={
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                loan.status === 'active'
                  ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                  : loan.status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : loan.status === 'pending'
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : loan.status === 'rejected'
                        ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                        : 'bg-muted/50 text-muted-foreground border border-border/50'
              }`}
            >
              {loan.status}
            </span>
            {loan.status === 'pending' && (
              <div className="pl-3 border-l border-border/50">
                <ApprovalActions loan={loan} onSuccess={fetchData} />
              </div>
            )}
          </div>
        }
        description={
          <div className="flex gap-4 text-muted-foreground flex-col sm:flex-row items-start sm:items-center">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <User size={14} className="text-primary" />
              {loan.customer?.name}
            </div>
            <div className="w-1 h-1 bg-border rounded-full hidden sm:block" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-black border border-amber-500/20">
              <span className="text-amber-500">★</span>
              <span>
                {(loan.customer?.trustRating || 5).toFixed(1)}/10 Trust
              </span>
            </div>
            <div className="w-1 h-1 bg-border rounded-full hidden sm:block" />
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Calendar size={14} className="text-primary" />
              Issued {new Date(loan.startDate).toLocaleDateString()}
            </div>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button
            onClick={() => navigate(`/customers/${loan.customer?._id}`)}
            variant="outline"
            className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-2 border-primary/20 hover:bg-primary/5 text-primary flex items-center justify-center"
          >
            <Activity className="w-4 h-4" />
            Profile
          </Button>

          <Tooltip content="Download Loan Statement">
            <Button
              variant="gradient"
              isLoading={isExportingModal}
              onClick={() => {
                setReportDateRange({
                  from: subMonths(new Date(), 1),
                  to: new Date(),
                });
                setIsExportModalOpen(true);
              }}
              className="h-12 px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-2"
            >
              <Download size={16} />
              Statement
            </Button>
          </Tooltip>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-4">
        <StatsCard
          title="Total Repayable"
          amount={formatCurrency(loan.totalAmount)}
          icon={<DollarSign size={18} />}
          color="bg-primary text-primary border-primary/20"
          isGlass
        />
        <StatsCard
          title="Monthly Installment"
          amount={formatCurrency(
            loan.remainingAmount <= 0 || loan.status === 'completed'
              ? 0
              : paidInstallmentsCount < loan.duration
                ? loan.remainingAmount / (loan.duration - paidInstallmentsCount)
                : loan.emi,
          )}
          icon={<Zap size={18} />}
          color="bg-indigo-500 text-indigo-600 border-indigo-500/20"
          badge={`${paidInstallmentsCount}/${loan.duration}`}
          badgeTooltip={`${paidInstallmentsCount} Installments Paid`}
          isGlass
        />
        <StatsCard
          title="Paid Amount"
          amount={formatCurrency(loan.paidAmount || 0)}
          icon={<CheckCircle2 size={18} />}
          color="bg-emerald-500 text-emerald-600 border-emerald-500/20"
          isGlass
        />
        <StatsCard
          title="Outstanding Balance"
          amount={formatCurrency(loan.remainingAmount)}
          icon={<AlertCircle size={18} />}
          color="bg-red-500 text-red-600 border-red-500/20"
          isGlass
        />
      </div>

      {/* Calendar Section */}
      <div className="w-full">
        <RepaymentCalendar upcomingPayments={upcomingPayments} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content: Repayment History */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black tracking-tighter">
                  Repayment Ledger
                </h3>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  Precise history of all settlements made against this loan.
                </p>
              </div>
              <div className="p-3 bg-muted/30 rounded-2xl">
                <FileText className="w-5 h-5 text-primary" />
              </div>
            </div>

            <div className="space-y-4">
              {repayments.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-[2rem] bg-muted/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 dark:text-muted-foreground/80">
                    Zero Repayments Registered
                  </p>
                </div>
              ) : (
                repayments.map((rp, i) => (
                  <div
                    key={rp._id}
                    className={cn(
                      'flex items-center justify-between p-4 sm:p-6 rounded-3xl border border-border/30 bg-muted/5 hover:bg-muted/10 transition-all group',
                      rp.status === 'Reversed' && 'opacity-50',
                    )}
                  >
                    <div className="flex items-center gap-5">
                      <div
                        className={cn(
                          'min-w-12 min-h-12 rounded-2xl flex items-center justify-center transition-all',
                          rp.status === 'Reversed'
                            ? 'bg-orange-500/10 text-orange-500'
                            : 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white',
                        )}
                      >
                        <CheckCircle2 size={22} />
                      </div>
                      <div>
                        <div className="text-sm font-black tracking-tight">
                          Repayment #{repayments.length - i}
                        </div>
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1 mt-0.5">
                          <Calendar size={10} />{' '}
                          {new Date(rp.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={cn(
                          'text-lg font-black',
                          rp.status === 'Reversed'
                            ? 'text-muted-foreground line-through'
                            : 'text-emerald-600',
                        )}
                      >
                        +{formatCurrency(rp.amount)}
                      </div>
                      {rp.status && (
                        <div
                          className={cn(
                            'text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-border/20 leading-none mt-1 ml-auto w-fit',
                            rp.status === 'Completed' &&
                              'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
                            rp.status === 'Pending' &&
                              'bg-amber-500/10 text-amber-600 border-amber-500/20',
                            rp.status === 'Failed' &&
                              'bg-rose-500/10 text-rose-600 border-rose-500/20',
                            rp.status === 'Reversed' &&
                              'bg-orange-500/10 text-orange-600 border-orange-500/20',
                          )}
                        >
                          <span
                            className={cn(
                              'w-1 h-1 rounded-full',
                              rp.status === 'Completed' && 'bg-emerald-500',
                              rp.status === 'Pending' &&
                                'bg-amber-500 animate-pulse',
                              rp.status === 'Failed' && 'bg-rose-500',
                              rp.status === 'Reversed' && 'bg-orange-500',
                            )}
                          />
                          {rp.status}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Infinite Scroll Trigger for Repayments */}
              {isMobile && hasMoreRepayments && (
                <div ref={repaymentObserverTarget}>
                  <InfiniteLoader isFetchingMore={isFetchingMoreRepayments} />
                </div>
              )}
            </div>
          </div>

          {/* Amortization Schedule Section */}
          <AmortizationSchedule
            schedule={displayedSchedule}
            paidInstallmentsCount={paidInstallmentsCount}
            isMobile={isMobile}
            pagination={{
              currentPage: schedulePage,
              totalPages: Math.ceil(allSchedule.length / scheduleLimit),
              totalEntries: allSchedule.length,
              limit: scheduleLimit,
              onPageChange: setSchedulePage,
              onLimitChange: (limit) => {
                setScheduleLimit(limit);
                setSchedulePage(1);
              },
            }}
            hasMore={hasMoreSchedule}
            isFetchingMore={isFetchingMoreSchedule}
            observerTarget={scheduleObserverTarget}
          />

          {/* Communication History Section */}
          <CommunicationLogs reminders={loan.automatedReminders || []} />

          {/* Investment History Section (Only for Members) */}
          {member && (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black tracking-tighter">
                    Investment Ledger
                  </h3>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">
                    History of deposits and earnings for this member.
                  </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>

              <div className="space-y-4">
                {investments.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-[2rem] bg-muted/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                      Zero Investments Registered
                    </p>
                  </div>
                ) : (
                  investments.map((inv, i) => (
                    <div
                      key={inv._id}
                      className="flex items-center justify-between p-4 sm:p-6 rounded-3xl border border-border/30 bg-muted/5 hover:bg-muted/10 transition-all group"
                    >
                      <div className="flex items-center gap-5">
                        <div
                          className={`min-w-12 min-h-12 rounded-2xl flex items-center justify-center transition-all ${
                            inv.type === 'deposit'
                              ? 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white'
                              : 'bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white'
                          }`}
                        >
                          <ArrowUpCircle
                            size={22}
                            className={
                              inv.type === 'withdrawal' ? 'rotate-180' : ''
                            }
                          />
                        </div>
                        <div>
                          <div className="text-sm font-black tracking-tight">
                            {inv.type === 'deposit'
                              ? 'Capital Deposit'
                              : 'Fund Withdrawal'}
                          </div>
                          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1 mt-0.5">
                            <Calendar size={10} />{' '}
                            {new Date(inv.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-lg font-black ${inv.type === 'deposit' ? 'text-blue-600' : 'text-orange-600'}`}
                        >
                          {inv.type === 'deposit' ? '+' : '-'}
                          {formatCurrency(inv.amount)}
                        </div>
                        <div className="flex items-center gap-2 justify-end mt-1">
                          {inv.status && (
                            <div
                              className={cn(
                                'text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-border/20 leading-none',
                                inv.status === 'Completed' &&
                                  'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
                                inv.status === 'Pending' &&
                                  'bg-amber-500/10 text-amber-600 border-amber-500/20',
                                inv.status === 'Failed' &&
                                  'bg-rose-500/10 text-rose-600 border-rose-500/20',
                              )}
                            >
                              <span
                                className={cn(
                                  'w-0.5 h-0.5 rounded-full',
                                  inv.status === 'Completed' &&
                                    'bg-emerald-500',
                                  inv.status === 'Pending' &&
                                    'bg-amber-500 animate-pulse',
                                  inv.status === 'Failed' && 'bg-rose-500',
                                )}
                              />
                              {inv.status}
                            </div>
                          )}
                          <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            {inv.description || 'System Entry'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Infinite Scroll Trigger for Investments */}
                {isMobile && hasMoreInvestments && (
                  <div ref={investmentObserverTarget}>
                    <InfiniteLoader
                      isFetchingMore={isFetchingMoreInvestments}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documents Section */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm">
            <DocumentManager
              loanId={loan._id}
              documents={loan.documents || []}
              onUpdate={fetchData}
            />
          </div>
        </div>

        {/* Sidebar: Financial Context & Settlement */}
        <div className="lg:col-span-4 space-y-8">
          {/* AI Risk Assessment Card */}
          {loan.riskDetails ? (
            <div
              className={`border p-5 sm:p-8 rounded-[2.5rem] shadow-sm space-y-4 relative overflow-hidden ${
                ['A+', 'A'].includes(loan.riskDetails.grade)
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : ['B', 'C'].includes(loan.riskDetails.grade)
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-red-500/5 border-red-500/20'
              }`}
            >
              <Zap className="absolute -right-8 -top-8 w-32 h-32 opacity-[0.05] text-primary" />
              <div className="flex items-center justify-between relative">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  AI Risk Engine
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    ['A+', 'A'].includes(loan.riskDetails.grade)
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : ['B', 'C'].includes(loan.riskDetails.grade)
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                  }`}
                >
                  Grade {loan.riskDetails.grade}
                </span>
              </div>

              <div className="relative">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-black">
                    {loan.riskDetails.score}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    Risk Score
                  </span>
                </div>
                <p className="text-sm font-bold text-foreground/80">
                  Recommendation: {loan.riskDetails.suggestion}
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-border/10 relative">
                {loan.riskDetails.factors.map((factor, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div
                      className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                        ['A+', 'A'].includes(loan.riskDetails.grade)
                          ? 'bg-emerald-500'
                          : ['B', 'C'].includes(loan.riskDetails.grade)
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      }`}
                    />
                    <span className="text-[11px] font-medium leading-tight text-muted-foreground">
                      {factor}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-border/50 border-dashed p-5 sm:p-8 rounded-[2.5rem] shadow-sm flex flex-col items-center justify-center gap-4 text-center opacity-70">
              <Zap className="w-8 h-8 text-muted-foreground/30" />
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  AI Risk Engine
                </h3>
                <p className="text-2xl font-black text-muted-foreground/50 mt-1">
                  —
                </p>
                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase mt-1">
                  Assessment Pending
                </p>
              </div>
            </div>
          )}

          {/* Agreement Terms */}
          <div className="bg-white dark:bg-slate-900 border border-border/50 p-5 sm:p-8 rounded-[2.5rem] shadow-sm space-y-6">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
              Agreement Parameters
              <Info size={12} />
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-2xl bg-muted/20 border border-border/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <DollarSign size={14} />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase">
                    Principal
                  </span>
                </div>
                <span className="font-black">
                  {formatCurrency(loan.principal)}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-2xl bg-muted/20 border border-border/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                    <Percent size={14} />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase">
                    Interest
                  </span>
                </div>
                <span className="font-black">
                  {loan.rate}%{' '}
                  <span className="text-[8px] opacity-60">APR</span>
                </span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-2xl bg-muted/20 border border-border/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <Clock size={14} />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase">
                    Duration
                  </span>
                </div>
                <span className="font-black">
                  {loan.duration}{' '}
                  <span className="text-[8px] opacity-60">MONTHS</span>
                </span>
              </div>
            </div>
          </div>

          {/* Member Settlement View */}
          {member && (
            <div className="bg-white dark:bg-slate-900 border border-border/50 p-5 sm:p-8 rounded-[2.5rem] shadow-sm space-y-6 sm:space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <Wallet className="w-24 h-24 text-primary" />
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-black tracking-tighter">
                  Settlement Analysis
                </h3>
              </div>

              <div className="space-y-6 pt-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">
                    Total Member Balance
                  </span>
                  <span className="font-black text-foreground">
                    {formatCurrency(member.currentBalance)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">
                    Outstanding Loan
                  </span>
                  <span className="font-black text-red-500">
                    ({formatCurrency(loan.remainingAmount)})
                  </span>
                </div>

                <div className="pt-6 border-t border-border/50">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Net Position (Remains)
                      </p>
                      <p
                        className={`text-4xl font-black tracking-tighter ${netBalance >= loan.remainingAmount ? 'text-emerald-500' : 'text-orange-500'}`}
                      >
                        {formatCurrency(netBalance - loan.remainingAmount)}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 sm:p-5 rounded-3xl border-2 flex items-center gap-4 transition-all ${
                    netBalance >= loan.remainingAmount
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600'
                      : 'bg-orange-500/5 border-orange-500/20 text-orange-600'
                  }`}
                >
                  {netBalance >= loan.remainingAmount ? (
                    <CheckCircle2 className="shrink-0" />
                  ) : (
                    <AlertCircle className="shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-wider">
                      {settlementStatus}
                    </p>
                    <p className="text-[10px] font-medium opacity-80">
                      {netBalance >= loan.remainingAmount
                        ? 'This member has sufficient internal funds to completely settle this debt.'
                        : 'Current balance is insufficient for full settlement. Balance adjustment required.'}
                    </p>
                  </div>
                </div>

                {netBalance >= loan.remainingAmount && (
                  <Button
                    variant="success"
                    className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em]"
                  >
                    Execute Internal Settlement
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Progress Card */}
          <div className="bg-white dark:bg-slate-900 border border-border/50 p-8 rounded-[2.5rem] shadow-sm space-y-6">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
              Loan Maturity
              <Zap size={12} className="text-primary" />
            </h3>
            <div className="space-y-4">
              <div className="flex items-end justify-between mb-2">
                <span className="text-4xl font-black tracking-tighter">
                  {progress}%
                </span>
                <span className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">
                  Recovered
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">
                {formatCurrency(loan.paidAmount)} of{' '}
                {formatCurrency(loan.totalAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Report Selection Modal */}
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
                  Loan Statement
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground/80 mt-1">
                  Select a custom date range for the repayment history report.
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
                  Note: The full amortization schedule will be included, but
                  transaction history will be filtered by this range.
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
              variant="gradient"
              onClick={handleDownloadStatement}
              disabled={isExportingModal}
              className="flex-1 min-h-14 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all border border-primary/20 text-white"
            >
              {isExportingModal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText size={16} className="mr-2" />
                  Generate PDF
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoanDetail;
