import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, capitalize } from '@/lib/utils';
import MemberLoansSkeleton from '@/components/member/MemberLoansSkeleton';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/ui/EmptyState';

const MemberGrantorRequests = () => {
  const navigate = useNavigate();
  const [grantorLoans, setGrantorLoans] = useState([]);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [memberRes, grantorLoansRes] = await Promise.all([
        api.get('/member-auth/me'),
        api.get('/loans/grantor-loans'),
      ]);
      setMember(memberRes.data);
      setGrantorLoans(grantorLoansRes.data || []);
    } catch (error) {
      console.error('Failed to fetch grantor data:', error);
      toast.error('Failed to load grantor requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGrantorStatus = async (loanId, status) => {
    try {
      await api.patch(`/loans/${loanId}/grantor-status`, { status });
      toast.success(`Grantor request ${status} successfully`);
      fetchData(); // Refresh data
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to update status`);
    }
  };

  const pendingRequests = grantorLoans.filter((loan) => {
    const g1Id = loan.grantor1?._id || loan.grantor1;
    const g2Id = loan.grantor2?._id || loan.grantor2;
    const currentMemberId = member?._id?.toString();
    return (
      loan.status === 'pending' &&
      ((g1Id?.toString() === currentMemberId &&
        loan.grantor1Status === 'pending') ||
        (g2Id?.toString() === currentMemberId &&
          loan.grantor2Status === 'pending'))
    );
  });

  const historyRequests = grantorLoans.filter((loan) => {
    const g1Id = loan.grantor1?._id || loan.grantor1;
    const g2Id = loan.grantor2?._id || loan.grantor2;
    const currentMemberId = member?._id?.toString();
    return (
      (g1Id?.toString() === currentMemberId &&
        loan.grantor1Status !== 'pending') ||
      (g2Id?.toString() === currentMemberId &&
        loan.grantor2Status !== 'pending')
    );
  });

  if (loading) {
    return (
      <div className="space-y-8 pb-20">
        <PageHeader
          title="Grantor Approvals"
          description="Manage loan requests where you are assigned as a grantor."
        />
        <MemberLoansSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Grantor Approvals"
          description="Manage loan requests where you are assigned as a grantor."
        />
        <Button
          variant="outline"
          size="sm"
          className="rounded-full gap-2 text-[10px] font-black uppercase tracking-widest"
          onClick={() => navigate('/member/dashboard')}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Button>
      </div>

      {/* Pending Requests Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-sm border border-amber-500/10">
            <Clock size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">
              Pending My Approval
            </h2>
            <p className="text-xs font-medium text-muted-foreground">
              Action required on these requests
            </p>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No Pending Requests"
            description="You don't have any pending grantor requests at the moment."
            className="bg-card/30 border-dashed"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingRequests.map((loan) => (
              <div
                key={loan._id}
                className="group p-6 sm:p-8 rounded-[2.5rem] border border-border/50 bg-card hover:bg-muted/30 transition-all duration-300 shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                        {loan.customer?.name?.charAt(0) || '#'}
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight capitalize">
                          {loan.customer?.name}
                        </h3>
                        <p className="text-xs font-medium text-muted-foreground">
                          Requested on{' '}
                          {new Date(loan.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                          Loan Amount
                        </span>
                        <span className="text-xl font-black tracking-tighter text-primary">
                          {formatCurrency(loan.principal)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                          Period
                        </span>
                        <span className="text-base font-bold">
                          {loan.duration} Months
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                          Installment
                        </span>
                        <span className="text-base font-bold">
                          {formatCurrency(loan.emi)}/mo
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-border/50">
                    <Button
                      onClick={() => handleGrantorStatus(loan._id, 'approved')}
                      variant="default"
                      className="rounded-full px-8 h-12 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                    >
                      <CheckCircle2 size={16} className="mr-2" /> Approve
                      Request
                    </Button>
                    <Button
                      onClick={() => handleGrantorStatus(loan._id, 'rejected')}
                      variant="outline"
                      className="rounded-full px-8 h-12 text-[10px] font-black uppercase tracking-widest border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
                    >
                      <XCircle size={16} className="mr-2" /> Reject
                    </Button>
                    <Link
                      to={`/member/loans/${loan._id}`}
                      className="p-3 bg-muted rounded-2xl hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
                    >
                      <ChevronRight size={20} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground shadow-sm border border-border/10">
            <History size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">
              Grantor History
            </h2>
            <p className="text-xs font-medium text-muted-foreground">
              Previous requests you've reviewed
            </p>
          </div>
        </div>

        {historyRequests.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No History"
            description="Your grantor history will appear here once you review requests."
            className="bg-muted/10 border-none"
          />
        ) : (
          <div className="bg-card rounded-[2.5rem] border border-border/40 shadow-sm overflow-hidden divide-y divide-border/30">
            {historyRequests.map((loan) => {
              const g1Id = loan.grantor1?._id || loan.grantor1;
              const myStatus =
                g1Id?.toString() === member?._id?.toString()
                  ? loan.grantor1Status
                  : loan.grantor2Status;

              return (
                <div
                  key={loan._id}
                  className="p-6 sm:p-8 hover:bg-muted/20 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        myStatus === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-rose-500/10 text-rose-600'
                      }`}
                    >
                      {myStatus === 'approved' ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <XCircle size={20} />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-base capitalize">
                        {loan.customer?.name}
                      </h4>
                      <p className="text-xs font-medium text-muted-foreground">
                        {formatCurrency(loan.principal)} | {loan.duration}{' '}
                        Months | Status: {capitalize(loan.status)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        myStatus === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-rose-500/10 text-rose-600'
                      }`}
                    >
                      {myStatus}
                    </span>
                    <p className="text-[10px] font-medium text-muted-foreground mt-1.5">
                      {loan.grantor1Status === myStatus
                        ? 'Grantor 1'
                        : 'Grantor 2'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default MemberGrantorRequests;
