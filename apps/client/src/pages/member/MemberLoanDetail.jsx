import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
  FileText,
  Loader2,
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
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import AmortizationSchedule from '@/components/loans/AmortizationSchedule';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { exportLoanStatement } from '@/lib/pdfExportUtils';
import Tooltip from '@/components/ui/Tooltip';
import MemberRepayModal from '@/components/member/MemberRepayModal';

import { Skeleton } from '@/components/ui/skeleton';

const MemberLoanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [truePrincipalPaid, setTruePrincipalPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [showPenaltyBanner, setShowPenaltyBanner] = useState(true);
  const [isExportingModal, setIsExportingModal] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [reportDateRange, setReportDateRange] = useState({
    from: subMonths(new Date(), 3), // 3 months default for member
    to: new Date(),
  });
  const [businessConfig, setBusinessConfig] = useState(null);

  // Fetch per-business config from the member's business owner
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await api.get(
          '/system-settings/member-business-config',
        );
        setBusinessConfig(data);
      } catch (err) {
        console.error('Failed to fetch business config:', err);
      }
    };
    fetchConfig();
  }, []);

  const lateFeeEnabled = businessConfig?.lateFeeEnabled === true;
  const lateFeeType = businessConfig?.lateFeeType || 'fixed';
  const lateFeeRate = businessConfig?.lateFeeRate ?? 0;
  const gracePeriod = businessConfig?.lateFeeGracePeriodDays ?? 0;

  const dailyFee =
    loan && lateFeeType === 'percentage'
      ? Math.round((loan.emi * (lateFeeRate / 100)) / 30)
      : Math.round(lateFeeRate / 30);

  useEffect(() => {
    const fetchLoanData = async () => {
      try {
        setLoading(true);
        const memberToken = localStorage.getItem('member');
        const headers = {
          /* Auth header handled by browser cookies */
        };

        const [loanRes, scheduleRes, repaymentsRes] = await Promise.all([
          api.get(`/loans/my-loans/${id}`, { headers }),
          api.get(`/loans/my-loans/${id}/schedule`, { headers }),
          api.get(`/repayments/my-repayments?loanId=${id}`, { headers }),
        ]);

        const allRepayments = repaymentsRes.data?.data || [];
        // Filter out reversed repayments for calculations
        const activeRepayments = allRepayments.filter(
          (rp) => rp.status !== 'Reversed',
        );
        const totalAccounted = activeRepayments.reduce(
          (sum, rp) =>
            sum + (rp.principalAmount || 0) + (rp.interestAmount || 0),
          0,
        );
        let calculatedPrincipalPaid = activeRepayments.reduce(
          (sum, rp) => sum + (rp.principalAmount || 0),
          0,
        );

        // Legacy fallback
        if (totalAccounted < loanRes.data.paidAmount - 1) {
          const missing = Math.max(0, loanRes.data.paidAmount - totalAccounted);
          const ratio =
            loanRes.data.principal / (loanRes.data.totalAmount || 1);
          calculatedPrincipalPaid += missing * ratio;
        }

        setLoan(loanRes.data);
        setSchedule(scheduleRes.data);
        setTruePrincipalPaid(calculatedPrincipalPaid);
      } catch (error) {
        console.error('Failed to fetch loan details:', error);
        toast.error('Failed to load loan details');
        navigate('/member/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchLoanData();
  }, [id, navigate]);

  const handleDownloadReport = async () => {
    try {
      setIsExportingModal(true);
      const allRepayments = loan.repayments || [];

      const filteredRepayments = allRepayments.filter((rp) => {
        const rpDate = new Date(rp.date);
        return (
          rpDate >= startOfDay(reportDateRange.from) &&
          rpDate <= endOfDay(reportDateRange.to)
        );
      });

      await exportLoanStatement(loan, filteredRepayments);
      toast.success('Loan statement downloaded successfully');
      setIsExportModalOpen(false);
    } catch (error) {
      console.error('PDF Export failed:', error);
      toast.error('Failed to generate statement');
    } finally {
      setIsExportingModal(false);
    }
  };

  const handleRepaySuccess = async () => {
    try {
      setLoading(true);
      const memberToken = localStorage.getItem('member');
      const headers = {
        /* Auth header handled by browser cookies */
      };

      const [loanRes, scheduleRes, repaymentsRes] = await Promise.all([
        api.get(`/loans/my-loans/${id}`, { headers }),
        api.get(`/loans/my-loans/${id}/schedule`, { headers }),
        api.get(`/repayments/my-repayments?loanId=${id}`, { headers }),
      ]);

      const allRepayments = repaymentsRes.data?.data || [];
      // Filter out reversed repayments for calculations
      const activeRepayments = allRepayments.filter(
        (rp) => rp.status !== 'Reversed',
      );
      const totalAccounted = activeRepayments.reduce(
        (sum, rp) => sum + (rp.principalAmount || 0) + (rp.interestAmount || 0),
        0,
      );
      let calculatedPrincipalPaid = activeRepayments.reduce(
        (sum, rp) => sum + (rp.principalAmount || 0),
        0,
      );

      // Legacy fallback
      if (totalAccounted < loanRes.data.paidAmount - 1) {
        const missing = Math.max(0, loanRes.data.paidAmount - totalAccounted);
        const ratio = loanRes.data.principal / (loanRes.data.totalAmount || 1);
        calculatedPrincipalPaid += missing * ratio;
      }

      setLoan(loanRes.data);
      setSchedule(scheduleRes.data);
      setTruePrincipalPaid(calculatedPrincipalPaid);
    } catch (error) {
      console.error('Failed to refresh loan details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-48 rounded-xl" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
          <Skeleton className="h-12 w-32 rounded-2xl hidden sm:block" />
        </div>

        {/* Progress Skeleton */}
        <Skeleton className="h-[280px] w-full rounded-[3rem]" />

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>

        {/* Schedule Skeleton */}
        <Skeleton className="h-[500px] w-full rounded-[3rem]" />
      </div>
    );
  }

  if (!loan) return null;

  const paidAmount = loan.totalAmount - loan.remainingAmount;
  const progressPercent = Math.round((paidAmount / loan.totalAmount) * 100);

  // Calculate paid installments based on exact true principal paid
  let currentPrincipalSum = 0;
  let paidInstallments = 0;

  for (let i = 0; i < schedule.length; i++) {
    currentPrincipalSum += schedule[i].principal;
    // We consider an installment "paid" if the principal paid so far covers its principal portion
    // allowing a small margin of error for rounding (+/- Rs. 10)
    if (truePrincipalPaid >= currentPrincipalSum - 10) {
      paidInstallments = i + 1;
    } else {
      break;
    }
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-2xl bg-card hover:bg-muted border border-border/50"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1 flex items-center justify-between">
          <PageHeader
            title={
              <>
                Loan <span className="text-primary ">Intelligence</span>
              </>
            }
            description={`Tracking #${loan._id.toString().slice(-6).toUpperCase()} - Issued on ${new Date(loan.startDate).toLocaleDateString()}`}
            compact
          />
          <Tooltip content="Download Full Statement">
            <Button
              onClick={() => {
                setReportDateRange({
                  from: subMonths(new Date(), 3),
                  to: new Date(),
                });
                setIsExportModalOpen(true);
              }}
              variant="outline"
              className="rounded-2xl gap-2 text-xs font-black uppercase tracking-widest px-6 py-6 border-primary/20 hover:bg-primary/5 text-primary transition-all duration-300"
              isLoading={isExportingModal}
            >
              <Download size={18} />
              <span className="hidden sm:inline">Export PDF</span>
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-card rounded-[3rem] p-8 sm:p-12 border border-border/50 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <TrendingUp size={240} className="text-primary" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                  Repayment Progress
                </span>
                <span className="text-2xl font-black tracking-tighter">
                  {progressPercent}%
                </span>
              </div>
              <Progress
                value={progressPercent}
                className="h-4 rounded-full bg-primary/10"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-2xl border border-emerald-500/20">
                <CheckCircle2 size={16} />
                <span className="text-xs font-black uppercase tracking-widest">
                  Paid: {formatCurrency(paidAmount)}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-blue-500/10 text-blue-600 px-4 py-2 rounded-2xl border border-blue-500/20">
                <Clock size={16} />
                <span className="text-xs font-black uppercase tracking-widest">
                  Due: {formatCurrency(loan.remainingAmount)}
                </span>
              </div>
              {loan.status === 'active' && (
                <Button
                  onClick={() => setIsRepayModalOpen(true)}
                  variant="gradient"
                  className="rounded-2xl gap-2 text-[10px] font-black uppercase tracking-widest px-6 shadow-lg shadow-primary/20"
                >
                  <DollarSign size={14} strokeWidth={3} />
                  Repay Now
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Interest Type
              </p>
              <p className="text-lg font-bold capitalize">
                {loan.interestType} Interest
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Monthly EMI
              </p>
              <p className="text-lg font-bold">{formatCurrency(loan.emi)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Duration
              </p>
              <p className="text-lg font-bold">{loan.duration} Months</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Interest Rate
              </p>
              <p className="text-lg font-bold">{loan.rate}% Annual</p>
            </div>
          </div>
        </div>
      </div>

      {/* Repayment Warning Banner */}
      {showPenaltyBanner &&
        lateFeeEnabled &&
        loan.status !== 'completed' &&
        loan.status !== 'rejected' && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-[2rem] p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4 group-hover:scale-110 transition-transform duration-500">
              <AlertCircle size={120} className="text-orange-500" />
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowPenaltyBanner(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-colors z-20"
              title="Dismiss Notice"
            >
              <X size={16} strokeWidth={3} />
            </button>

            <div className="p-4 bg-orange-500/20 rounded-2xl text-orange-600 shadow-inner">
              <AlertCircle size={24} strokeWidth={2.5} />
            </div>
            <div className="space-y-2 text-center sm:text-left relative z-10">
              <h4 className="text-lg font-black tracking-tight text-orange-700">
                Late Payment Protection Notice
              </h4>
              <p className="text-sm text-orange-600/80 font-medium leading-relaxed max-w-2xl">
                To maintain your credit profile and avoid system-generated
                penalties, please ensure installments are paid within the{' '}
                <span className="font-black text-orange-700 underline decoration-2 underline-offset-4">
                  {gracePeriod}-day grace period
                </span>{' '}
                of your due date. A daily late fee of{' '}
                <span className="bg-orange-500 text-white px-2 py-0.5 rounded-lg font-black tracking-tighter mx-1 inline-flex items-center shadow-sm">
                  {formatCurrency(dailyFee)}
                </span>{' '}
                (
                {lateFeeType === 'percentage'
                  ? `${lateFeeRate}%`
                  : formatCurrency(lateFeeRate)}{' '}
                monthly rate) will be applied automatically to all overdue
                payments.
              </p>
            </div>
          </div>
        )}

      {/* Stats Quick Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Principal"
          amount={formatCurrency(loan.principal)}
          icon={<DollarSign size={20} />}
          color="bg-primary"
        />
        <StatsCard
          title="Total Payload"
          amount={formatCurrency(loan.totalAmount)}
          icon={<TrendingUp size={20} />}
          color="bg-purple-500"
        />
        <StatsCard
          title="Amount Paid"
          amount={formatCurrency(paidAmount)}
          icon={<CheckCircle2 size={20} />}
          color="bg-emerald-500"
        />
        <StatsCard
          title="Next Due"
          amount={
            loan.nextPaymentDate
              ? new Date(loan.nextPaymentDate).toLocaleDateString()
              : 'N/A'
          }
          icon={<Calendar size={20} />}
          color="bg-orange-500"
        />
      </div>

      {/* Interactive Schedule */}
      <AmortizationSchedule
        schedule={schedule}
        paidInstallmentsCount={paidInstallments}
      />

      {/* Helpful Hint */}
      <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 flex gap-4 items-start">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
          <AlertCircle size={20} />
        </div>
        <div>
          <h4 className="font-bold text-sm">Advisor Tip</h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Maintaining a perfect track record with your repayments
            significantly boosts your credit profile within our network,
            unlocking higher limits and lower rates for future ventures.
          </p>
        </div>
      </div>

      <MemberRepayModal
        isOpen={isRepayModalOpen}
        onClose={() => setIsRepayModalOpen(false)}
        loan={loan}
        onSuccess={handleRepaySuccess}
      />

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
                  Select a customized period for your loan repayment statement.
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
              className="flex-1 rounded-[1.25rem] h-14 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              disabled={isExportingModal}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleDownloadReport}
              disabled={isExportingModal}
              className="flex-1 h-14 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all border border-primary/20 text-white"
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

export default MemberLoanDetail;
