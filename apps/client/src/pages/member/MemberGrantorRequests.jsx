import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  PenTool,
  ScrollText,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, capitalize } from '@/lib/utils';
import MemberAvatar from '@/components/member/MemberAvatar';
import { MemberLoansPageSkeleton } from '@/components/ui/PageSkeletons';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import SignaturePad from '@/components/ui/SignaturePad';
import SensitiveData from '@/components/ui/SensitiveData';

const MemberGrantorRequests = () => {
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
          <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <Clock />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Awaiting action
            </p>
            <h2 className="text-xl font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
              Pending my approval
            </h2>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No Pending Requests"
            description="You don't have any pending grantor requests at the moment."
            className="bg-white dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.06]"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {pendingRequests.map((loan) => (
              <div
                key={loan._id}
                className="group p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:bg-slate-50/40 dark:hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <MemberAvatar
                        name={loan.customer?.name || '#'}
                        profilePicture={loan.customer?.profilePicture}
                        size={32}
                        rounded="rounded-full"
                        className="text-sm"
                      />
                      <div>
                        <h3 className="text-base font-extrabold tracking-[-0.02em] capitalize text-slate-900 dark:text-white">
                          {capitalize(loan.customer?.name)}
                        </h3>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Requested{' '}
                          {new Date(loan.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 block">
                          Loan amount
                        </span>
                        <span className="text-xl font-extrabold tracking-tight tabular-nums text-primary">
                          {formatCurrency(loan.principal)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 block">
                          Period
                        </span>
                        <span className="text-sm font-extrabold tabular-nums text-slate-900 dark:text-white">
                          {loan.duration} months
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 block">
                          Installment
                        </span>
                        <span className="text-sm font-extrabold tabular-nums text-slate-900 dark:text-white">
                          {formatCurrency(loan.emi)}/mo
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-white/[0.06]">
                    <Button
                      onClick={() => openAgreement(loan)}
                      className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[11px] uppercase tracking-[0.12em] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <PenTool size={12} strokeWidth={2.5} /> Review & sign
                    </Button>
                    <Button
                      onClick={() => handleGrantorStatus(loan._id, 'rejected')}
                      variant="outline"
                      className="rounded-full px-6 h-11 text-[11px] font-extrabold uppercase tracking-[0.12em] border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white"
                    >
                      <XCircle size={12} strokeWidth={2.5} className="mr-2" /> Reject
                    </Button>
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
          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-500 dark:text-slate-400 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <History />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Past activity
            </p>
            <h2 className="text-xl font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
              Grantor history
            </h2>
          </div>
        </div>

        {historyRequests.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No History"
            description="Your grantor history will appear here once you review requests."
            className="bg-white dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.06]"
          />
        ) : (
          <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] overflow-hidden divide-y divide-slate-100 dark:divide-white/[0.06]">
            {historyRequests.map((loan) => {
              const g1Id = loan.grantor1?._id || loan.grantor1;
              const myStatus =
                g1Id?.toString() === member?._id?.toString()
                  ? loan.grantor1Status
                  : loan.grantor2Status;

              return (
                <div
                  key={loan._id}
                  className="p-5 sm:p-6 hover:bg-slate-50/40 dark:hover:bg-white/[0.02] transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full [&_svg]:w-3.5 [&_svg]:h-3.5 ${
                        myStatus === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {myStatus === 'approved' ? (
                        <CheckCircle2 />
                      ) : (
                        <XCircle />
                      )}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm tracking-[-0.02em] capitalize text-slate-900 dark:text-white">
                        {capitalize(loan.customer?.name)}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatCurrency(loan.principal)} · {loan.duration}{' '}
                        months · {capitalize(loan.status)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge
                      status={myStatus}
                      className="text-[9px] font-extrabold uppercase tracking-[0.12em]"
                    />
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">
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
                <Button
                  variant="ghost"
                  onClick={closeAgreement}
                  className="p-2 rounded-xl hover:bg-muted transition-all"
                >
                  <X size={18} />
                </Button>
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
                      {capitalize(agreementLoan.customer?.name)}
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
                        {capitalize(member?.name) || 'the undersigned'}
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
                        {capitalize(agreementLoan.customer?.name)}
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
                      {capitalize(member?.name) || 'N/A'}
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
