import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  ArrowUpCircle,
  Download,
  Loader2,
} from 'lucide-react';
import api from '@/lib/axios';
import { formatPKR } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Tooltip from '@/components/ui/Tooltip';
import { generateWhatsAppLink, generateEmailLink } from '@/lib/reminderUtils';
import DocumentManager from '@/components/DocumentManager';
import StatsCard from '@/components/StatsCard';
import InfiniteLoader from '@/components/InfiniteLoader';
import RepaymentCalendar from '@/components/RepaymentCalendar';
import ApprovalActions from '@/components/loans/ApprovalActions';
import AmortizationSchedule from '@/components/AmortizationSchedule';
import CommunicationLogs from '@/components/CommunicationLogs';
import { exportLoanStatement } from '@/lib/pdfExportUtils';

const LoanDetailSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="h-40 bg-card/30 rounded-[2.5rem] border border-border/50" />
    <div className="grid gap-6 md:grid-cols-3">
      <Skeleton className="h-32 rounded-[2rem]" />
      <Skeleton className="h-32 rounded-[2rem]" />
      <Skeleton className="h-32 rounded-[2rem]" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Skeleton className="lg:col-span-8 h-[600px] rounded-[2.5rem]" />
      <Skeleton className="lg:col-span-4 h-[400px] rounded-[2.5rem]" />
    </div>
  </div>
);

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
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

  const itemsPerPage = 3;
  const itemsPerPageScheduleMobile = 2; // As requested

  const repaymentObserverTarget = useRef(null);
  const investmentObserverTarget = useRef(null);
  const scheduleObserverTarget = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const loanRes = await api.get(`/loans/${id}`);
      setLoan(loanRes.data);

      const repaymentsRes = await api.get(`/repayments?loanId=${id}`);
      const allRepayments = repaymentsRes.data.data || [];

      // Calculate actual installments paid based on amount, not just record count
      const actualInstallmentsPaid = Math.min(
        Math.floor(loanRes.data.paidAmount / loanRes.data.emi),
        loanRes.data.duration,
      );
      setPaidInstallmentsCount(actualInstallmentsPaid);

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

      const scheduleRes = await api.get(`/loans/${id}/schedule`);
      const fullSchedule = scheduleRes.data || [];
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

  if (loading) return <LoanDetailSkeleton />;
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
      setIsExporting(true);
      await exportLoanStatement(loan, repayments, member);
      toast.success('Statement downloaded successfully');
    } catch (error) {
      console.error('PDF Export failed:', error);
      toast.error('Failed to generate statement');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900/50 p-5 sm:p-8 rounded-[2.5rem] border border-border/50 shadow-sm relative overflow-hidden">
        <ShieldCheck className="absolute -right-12 -top-12 w-64 h-64 opacity-[0.03] text-primary pointer-events-none" />

        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/loans')}
            className="p-3 rounded-full hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground transition-all group hidden sm:block"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black tracking-tighter">
                Loan #{loan._id.slice(-6).toUpperCase()}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${
                  loan.status === 'active'
                    ? 'bg-blue-500/10 text-blue-500'
                    : loan.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : loan.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-500'
                        : loan.status === 'rejected'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-muted/50 dark:bg-white/5 text-muted-foreground dark:text-muted-foreground/80'
                }`}
              >
                {loan.status}
              </span>
              {loan.status === 'pending' && (
                <div className="ml-2 pl-2 border-l border-border/50">
                  <ApprovalActions loanId={loan._id} onSuccess={fetchData} />
                </div>
              )}
            </div>
            <div className="flex gap-4 text-muted-foreground flex-col sm:flex-row items-start sm:items-center">
              <div className="flex items-center gap-1.5 text-sm font-medium">
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
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Calendar size={14} className="text-primary" />
                Issued {new Date(loan.startDate).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip content="Send WhatsApp Reminder">
            <a
              href={generateWhatsAppLink(
                loan.customer?.phone,
                loan.customer?.name,
                loan.emi,
                new Date(),
                false,
              )}
              target="_blank"
              rel="noreferrer"
              className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
            >
              <MessageSquare size={20} />
            </a>
          </Tooltip>
          <Tooltip content="Send Email Reminder">
            <a
              href={generateEmailLink(
                loan.customer?.email,
                loan.customer?.name,
                loan.emi,
                new Date(),
                false,
              )}
              className="p-3 bg-primary/10 text-primary rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all active:scale-95"
            >
              <Mail size={20} />
            </a>
          </Tooltip>
          <Tooltip content="Download Statement">
            <button
              onClick={handleDownloadStatement}
              disabled={isExporting}
              className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl hover:bg-blue-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
            >
              <Download
                size={20}
                className={isExporting ? 'animate-bounce' : ''}
              />
            </button>
          </Tooltip>
          <Button
            onClick={() => navigate(`/customers/${loan.customer?._id}`)}
            variant="gradient"
            className="px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest gap-1 w-full sm:w-auto "
          >
            <Activity className="w-3.5 h-3.5" />
            Full Profile
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-4">
        <StatsCard
          title="Total Repayable"
          amount={formatPKR(loan.totalAmount)}
          icon={<DollarSign size={18} />}
          color="bg-primary text-primary border-primary/20"
          isGlass
        />
        <StatsCard
          title="Monthly Installment"
          amount={formatPKR(
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
          amount={formatPKR(loan.paidAmount || 0)}
          icon={<CheckCircle2 size={18} />}
          color="bg-emerald-500 text-emerald-600 border-emerald-500/20"
          isGlass
        />
        <StatsCard
          title="Outstanding Balance"
          amount={formatPKR(loan.remainingAmount)}
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
                    className="flex items-center justify-between p-4 sm:p-6 rounded-3xl border border-border/30 bg-muted/5 hover:bg-muted/10 transition-all group"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
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
                      <div className="text-lg font-black text-emerald-600">
                        +{formatPKR(rp.amount)}
                      </div>
                      <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                        Status: Confirmed
                      </div>
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
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
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
                          {formatPKR(inv.amount)}
                        </div>
                        <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                          {inv.description || 'System Entry'}
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
                <span className="font-black">{formatPKR(loan.principal)}</span>
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
                    {formatPKR(member.currentBalance)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">
                    Outstanding Loan
                  </span>
                  <span className="font-black text-red-500">
                    ({formatPKR(loan.remainingAmount)})
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
                        {formatPKR(netBalance - loan.remainingAmount)}
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
                {formatPKR(loan.paidAmount)} of {formatPKR(loan.totalAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanDetail;
