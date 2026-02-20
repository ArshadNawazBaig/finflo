import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import AmortizationSchedule from '@/components/loans/AmortizationSchedule';
import api from '@/lib/axios';
import { formatPKR, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportLoanStatement } from '@/lib/pdfExportUtils';
import Tooltip from '@/components/ui/Tooltip';
import MemberRepayModal from '@/components/member/MemberRepayModal';

const MemberLoanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);

  useEffect(() => {
    const fetchLoanData = async () => {
      try {
        setLoading(true);
        const memberToken = localStorage.getItem('memberToken');
        const headers = { Authorization: `Bearer ${memberToken}` };

        const [loanRes, scheduleRes] = await Promise.all([
          api.get(`/loans/my-loans/${id}`, { headers }),
          api.get(`/loans/my-loans/${id}/schedule`, { headers }),
        ]);

        setLoan(loanRes.data);
        setSchedule(scheduleRes.data);
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

  const handleRepaySuccess = async () => {
    try {
      setLoading(true);
      const memberToken = localStorage.getItem('memberToken');
      const headers = { Authorization: `Bearer ${memberToken}` };

      const [loanRes, scheduleRes] = await Promise.all([
        api.get(`/loans/my-loans/${id}`, { headers }),
        api.get(`/loans/my-loans/${id}/schedule`, { headers }),
      ]);

      setLoan(loanRes.data);
      setSchedule(scheduleRes.data);
    } catch (error) {
      console.error('Failed to refresh loan details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="space-y-10 animate-pulse">
        <div className="h-20 bg-muted rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-3xl" />
          ))}
        </div>
        <div className="h-96 bg-muted rounded-[3rem]" />
      </div>
    );

  if (!loan) return null;

  const paidAmount = loan.totalAmount - loan.remainingAmount;
  const progressPercent = Math.round((paidAmount / loan.totalAmount) * 100);
  const paidInstallments =
    loan.emi > 0 ? Math.floor(loan.paidAmount / loan.emi) : 0;

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
              onClick={() => exportLoanStatement(loan, loan.repayments || [])}
              variant="outline"
              className="rounded-2xl gap-2 text-xs font-black uppercase tracking-widest px-6 py-6 border-primary/20 hover:bg-primary/5 text-primary"
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
                  Paid: {formatPKR(paidAmount)}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-blue-500/10 text-blue-600 px-4 py-2 rounded-2xl border border-blue-500/20">
                <Clock size={16} />
                <span className="text-xs font-black uppercase tracking-widest">
                  Due: {formatPKR(loan.remainingAmount)}
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
              <p className="text-lg font-bold">{formatPKR(loan.emi)}</p>
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

      {/* Stats Quick Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Principal"
          amount={formatPKR(loan.principal)}
          icon={<DollarSign size={20} />}
          color="bg-primary"
        />
        <StatsCard
          title="Total Payload"
          amount={formatPKR(loan.totalAmount)}
          icon={<TrendingUp size={20} />}
          color="bg-purple-500"
        />
        <StatsCard
          title="Amount Paid"
          amount={formatPKR(paidAmount)}
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
    </div>
  );
};

export default MemberLoanDetail;
