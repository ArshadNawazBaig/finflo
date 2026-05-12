import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ChevronRight,
  ArrowLeft,
  PenTool,
  ScrollText,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, capitalize } from '@/lib/utils';
import { MemberLoansPageSkeleton } from '@/components/ui/PageSkeletons';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import SignaturePad from '@/components/ui/SignaturePad';
import SensitiveData from '@/components/ui/SensitiveData';

const MemberGrantorRequests = () => {
  const navigate = useNavigate();
  const [grantorLoans, setGrantorLoans] = useState([]);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  // Agreement modal state
  const [agreementLoan, setAgreementLoan] = useState(null);
  const [signature, setSignature] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Open agreement modal instead of directly approving
  const openAgreement = (loan) => {
    setAgreementLoan(loan);
    setSignature(member?.signature || null);
    setAgreedToTerms(false);
  };

  const closeAgreement = () => {
    setAgreementLoan(null);
    setSignature(null);
    setAgreedToTerms(false);
  };

  const handleGrantorStatus = async (loanId, status, sig = null) => {
    try {
      setIsSubmitting(true);
      await api.patch(`/loans/${loanId}/grantor-status`, {
        status,
        ...(sig ? { signature: sig } : {}),
      });
      toast.success(
        status === 'approved'
          ? 'Agreement signed & request approved successfully'
          : 'Grantor request rejected',
      );
      closeAgreement();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setIsSubmitting(false);
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
    return <MemberLoansPageSkeleton />;
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Grantor Approvals"
          description="Manage loan requests where you are assigned as a grantor."
        />
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
                      <div className="min-w-12 min-h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                        {loan.customer?.name?.charAt(0)?.toUpperCase() || '#'}
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
                      onClick={() => openAgreement(loan)}
                      variant="default"
                      className="rounded-full px-8 h-12 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                    >
                      <PenTool size={16} className="mr-2" /> Review & Sign
                    </Button>
                    <Button
                      onClick={() => handleGrantorStatus(loan._id, 'rejected')}
                      variant="outline"
                      className="rounded-full px-8 h-12 text-[10px] font-black uppercase tracking-widest border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
                    >
                      <XCircle size={16} className="mr-2" /> Reject
                    </Button>
                    {/* <Link
                      to={`/member/loans/${loan._id}`}
                      className="p-3 bg-muted rounded-2xl hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
                    >
                      <ChevronRight size={20} />
                    </Link> */}
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
                      className={`min-w-10 min-h-10 rounded-xl flex items-center justify-center ${
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

      {/* ═══════════════════════════════════════════════════════════════════
          GUARANTOR AGREEMENT MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {agreementLoan &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-card rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-border/50 overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-border/30 bg-gradient-to-r from-primary/5 to-indigo-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <ScrollText size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">
                      Guarantor Agreement
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Read carefully before signing
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeAgreement}
                  className="p-2 rounded-xl hover:bg-muted transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Agreement Body */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                {/* Loan Summary Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-muted/30 border border-border/30">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Borrower
                    </p>
                    <p className="text-sm font-black capitalize mt-0.5">
                      {agreementLoan.customer?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Loan Amount
                    </p>
                    <p className="text-sm font-black text-primary mt-0.5">
                      {formatCurrency(agreementLoan.principal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Duration
                    </p>
                    <p className="text-sm font-black mt-0.5">
                      {agreementLoan.duration} Months
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Monthly EMI
                    </p>
                    <p className="text-sm font-black mt-0.5">
                      {formatCurrency(agreementLoan.emi)}
                    </p>
                  </div>
                </div>

                {/* Agreement Text */}
                <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                  <h3 className="text-base font-black text-foreground flex items-center gap-2">
                    <FileText size={16} className="text-primary" />
                    Terms & Conditions of Guarantorship
                  </h3>

                  <div className="space-y-3 pl-1">
                    <p>
                      <strong className="text-foreground">
                        1. Guarantee Obligation:
                      </strong>{' '}
                      I,{' '}
                      <span className="text-foreground font-bold">
                        {member?.name || 'the undersigned'}
                      </span>
                      , CNIC:{' '}
                      <span className="text-foreground font-bold">
                        <SensitiveData maskLength={15} iconSize={12}>{member?.cnic || 'N/A'}</SensitiveData>
                      </span>
                      , hereby voluntarily agree to act as a guarantor for the
                      loan of{' '}
                      <span className="text-primary font-bold">
                        {formatCurrency(agreementLoan.principal)}
                      </span>{' '}
                      issued to{' '}
                      <span className="text-foreground font-bold capitalize">
                        {agreementLoan.customer?.name}
                      </span>
                      .
                    </p>

                    <p>
                      <strong className="text-foreground">2. Liability:</strong>{' '}
                      In the event the borrower fails to repay the loan or any
                      installment thereof, I understand that I shall be jointly
                      and severally liable for the outstanding loan amount,
                      including any accrued interest, late fees, and penalties.
                    </p>

                    <p>
                      <strong className="text-foreground">
                        3. Recovery Rights:
                      </strong>{' '}
                      The lending institution reserves the right to recover
                      outstanding dues from my account balances (current and/or
                      saving accounts) without prior notice, in the event of
                      borrower default.
                    </p>

                    <p>
                      <strong className="text-foreground">
                        4. Duration of Guarantee:
                      </strong>{' '}
                      This guarantee shall remain in effect from the loan
                      disbursement date until the loan is fully repaid,
                      including all principal, interest, late fees, and any
                      other charges. The loan duration is{' '}
                      <span className="text-foreground font-bold">
                        {agreementLoan.duration} months
                      </span>{' '}
                      with a monthly installment of{' '}
                      <span className="text-foreground font-bold">
                        {formatCurrency(agreementLoan.emi)}
                      </span>
                      .
                    </p>

                    <p>
                      <strong className="text-foreground">
                        5. Credit Impact:
                      </strong>{' '}
                      I acknowledge that acting as a guarantor may affect my own
                      credit limit and future borrowing capacity. My available
                      credit limit may be reduced by the guaranteed loan amount
                      until the loan is fully settled.
                    </p>

                    <p>
                      <strong className="text-foreground">
                        6. Irrevocability:
                      </strong>{' '}
                      Once accepted, this guarantee cannot be withdrawn or
                      cancelled while the loan remains outstanding, unless the
                      borrower provides an alternative guarantor approved by the
                      lending institution.
                    </p>

                    <p>
                      <strong className="text-foreground">
                        7. Legal Proceedings:
                      </strong>{' '}
                      In case of default, the lending institution may initiate
                      legal proceedings against me as the guarantor to recover
                      the outstanding amount, and I consent to the jurisdiction
                      of local courts for resolution of any disputes.
                    </p>
                  </div>
                </div>

                {/* Warning Box */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                  <AlertTriangle
                    size={18}
                    className="text-amber-500 mt-0.5 shrink-0"
                  />
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 leading-relaxed">
                    By signing this agreement, you accept full financial
                    responsibility as a guarantor. If the borrower defaults, you
                    may be required to repay the outstanding amount from your
                    own account. Please ensure you understand the risks before
                    proceeding.
                  </p>
                </div>

                {/* Terms Checkbox */}
                <label className="flex items-start gap-3 cursor-pointer group p-4 rounded-2xl hover:bg-muted/30 transition-all border border-transparent hover:border-border/30">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-2 border-primary/30 text-primary focus:ring-primary/20 cursor-pointer accent-primary"
                  />
                  <span className="text-sm font-bold text-foreground leading-relaxed">
                    I have read, understood, and agree to all the terms and
                    conditions of this Guarantor Agreement. I confirm that I am
                    signing this document voluntarily and without coercion.
                  </span>
                </label>

                {/* Guarantor Info */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/20 border border-border/20">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Guarantor Name
                    </p>
                    <p className="text-sm font-black mt-0.5 capitalize">
                      {member?.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      CNIC
                    </p>
                    <p className="text-sm font-black mt-0.5">
                      <SensitiveData maskLength={15} iconSize={12}>{member?.cnic || 'N/A'}</SensitiveData>
                    </p>
                  </div>
                </div>

                {/* Signature Pad or Saved Signature */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                    <PenTool size={14} className="text-primary" />
                    Your Signature
                  </h3>

                  {member?.signature ? (
                    <div className="rounded-2xl border-2 border-primary/20 bg-white flex flex-col items-center justify-center gap-4 py-6">
                      <img
                        src={member.signature}
                        alt="Saved Signature"
                        className="max-h-24 object-contain mix-blend-multiply"
                      />
                      <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 uppercase tracking-widest">
                        <CheckCircle2 size={12} />
                        Using your saved signature
                      </p>
                    </div>
                  ) : (
                    <>
                      <SignaturePad
                        onSave={(dataUrl) => setSignature(dataUrl)}
                        onClear={() => setSignature(null)}
                      />
                      {!signature && agreedToTerms && (
                        <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                          <AlertTriangle size={10} />
                          Please draw your signature above to proceed
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-5 border-t border-border/30 flex items-center justify-between bg-muted/10">
                <Button
                  variant="outline"
                  onClick={closeAgreement}
                  className="rounded-full px-6 h-11 text-[10px] font-black uppercase tracking-widest"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    handleGrantorStatus(
                      agreementLoan._id,
                      'approved',
                      signature || member?.signature,
                    )
                  }
                  disabled={
                    !agreedToTerms ||
                    (!signature && !member?.signature) ||
                    isSubmitting
                  }
                  isLoading={isSubmitting}
                  className="rounded-full px-8 h-11 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 size={16} className="mr-2" />I Agree & Approve
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default MemberGrantorRequests;
