import { useState, useEffect, useRef } from 'react';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Loader2,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  FileText,
  Phone,
  Lock,
  Mail,
  CheckCircle2,
  Check,
  XCircle,
  Copy,
  Link2,
} from 'lucide-react';
import { io } from 'socket.io-client';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthLayout from '@/layouts/AuthLayout';
import { formatCNIC, validateEmail } from '@/lib/utils';
import { validatePassword } from '@/lib/passwordPolicy';
import PasswordInput from '@/components/ui/PasswordInput';
import PasswordRequirements from '@/components/ui/PasswordRequirements';
import FormField from '@/components/ui/FormField';
import { SOCKET_URL } from '@/lib/constants';
import SEO from '@/components/SEO';

/**
 * Public facing page where members can self-register given a business security code inline.
 */
const SelfRegister = () => {
  useDocumentTitle('Join');
  const { code } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status');
  const memberIdParam = searchParams.get('memberId');
  const isKnownStatus = ['pending', 'approved', 'rejected'].includes(
    initialStatus,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Seed from the URL so a member returning to /join/:code?status=... lands
  // straight on their status screen.
  const [isSuccess, setIsSuccess] = useState(isKnownStatus);
  // 'waiting' | 'approved' | 'rejected'
  const [approvalState, setApprovalState] = useState(
    initialStatus === 'approved'
      ? 'approved'
      : initialStatus === 'rejected'
        ? 'rejected'
        : 'waiting',
  );
  const [rejectionReason, setRejectionReason] = useState(null);
  const [copied, setCopied] = useState(false);
  const socketRef = useRef(null);
  const pollRef = useRef(null);
  // Guards against the socket and the polling fallback both processing the same
  // decision (double toast / double redirect).
  const decidedRef = useRef(false);
  // Member id powering the live socket + polling fallback. Seeded from the URL
  // (returning member) and set on a fresh registration.
  const [memberId, setMemberId] = useState(memberIdParam || null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      securityCode: code?.toUpperCase() || '',
    },
  });

  const currentSecurityCode = watch('securityCode');
  const password = watch('password');

  // Cleanup socket + poll on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  // Apply an admin decision to the UI — shared by the live socket and the
  // polling fallback. Idempotent: only the first decision is processed.
  const handleDecision = ({ status, message, rejectionReason: reason }) => {
    if (status !== 'approved' && status !== 'rejected') return;
    if (decidedRef.current) return;
    decidedRef.current = true;

    // Stop both watchers — the decision is final.
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    setApprovalState(status);
    if (reason) setRejectionReason(reason);
    // Reflect the decision in the URL so a saved/copied link shows the latest
    // state on the next visit.
    setSearchParams(
      memberId ? { status, memberId } : { status },
      { replace: true },
    );

    if (status === 'approved') {
      toast.success(message || 'Your account has been approved!');
      setTimeout(() => {
        navigate(
          `/member/login?code=${currentSecurityCode?.toUpperCase() || ''}`,
        );
      }, 3000);
    } else {
      toast.error(message || 'Your registration was not approved.');
    }
  };

  const connectPendingSocket = (memberId) => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(
        '[Socket-Pending] Connected, joining pending room for',
        memberId,
      );
      socket.emit('join:pending_member', { memberId });
    });

    socket.on('member:approval_result', (payload) => {
      console.log('[Socket-Pending] Approval result received:', payload?.status);
      handleDecision(payload);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket-Pending] Disconnected:', reason);
    });
  };

  // A returning member can reopen /join/:code?status=pending&memberId=... — reconnect
  // the socket so the status keeps updating live (and the server replays a decision
  // that was made while they were away).
  useEffect(() => {
    if (initialStatus === 'pending' && memberIdParam && !socketRef.current) {
      connectPendingSocket(memberIdParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling fallback: while waiting on a decision, poll the public status
  // endpoint so the screen still updates if the live socket can't deliver the
  // result (e.g. another logged-in session's auth cookie hijacks the observer
  // socket, or the socket simply drops). Stops the moment a decision lands.
  useEffect(() => {
    if (!isSuccess || approvalState !== 'waiting' || !memberId) return;

    let active = true;
    const check = async () => {
      try {
        const { data } = await api.get(
          `/members/registration-status/${memberId}`,
        );
        if (!active) return;
        const status = data?.approvalStatus;
        if (status === 'approved' || status === 'rejected') {
          handleDecision({
            status,
            rejectionReason: data?.rejectionReason,
            message:
              status === 'approved'
                ? 'Your account has been approved! You can now log in.'
                : 'Your registration was not approved at this time.',
          });
        }
      } catch {
        /* transient error — keep polling */
      }
    };

    pollRef.current = setInterval(check, 5000);
    check(); // immediate check so an already-made decision shows without delay

    return () => {
      active = false;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, approvalState, memberId]);

  const copyStatusLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Status link copied — keep it to check back anytime.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Please copy the link from the address bar.');
    }
  };

  const onSubmit = async (data) => {
    const { isValid, message } = validatePassword(data.password);
    if (!isValid) {
      toast.error(message);
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post('/members/self-register', data);
      const memberId = response.data?.memberId;
      if (memberId) setMemberId(memberId);
      setIsSuccess(true);
      // Persist status + member id in the URL so the member can bookmark or copy
      // this link and check their application status whenever they want.
      setSearchParams(
        memberId ? { status: 'pending', memberId } : { status: 'pending' },
        { replace: true },
      );
      toast.success('Registration request sent successfully!');
      // Connect to socket to await admin decision
      if (memberId) {
        connectPendingSocket(memberId);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to register. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    // Approval decision received
    if (approvalState === 'approved') {
      return (
        <>
          <SEO
            title="Account Approved"
            description="Your Finflo account has been approved. Redirecting to login..."
            keywords="finflo approval, account active, banking registration success"
          />
          <AuthLayout showLogo backToLanding={false}>
            <div className="space-y-7 text-center">
              <div className="relative w-20 h-20 mx-auto animate-in zoom-in duration-500">
                <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="relative w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
                  <CheckCircle2 size={40} />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl lg:text-[2rem] font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 leading-tight">
                  You&apos;re approved! 🎉
                </h2>
                <p className="text-slate-500 dark:text-white/70 text-sm leading-relaxed">
                  Your account is active. Redirecting you to login…
                </p>
              </div>

              <Button
                onClick={() =>
                  navigate(
                    `/member/login?code=${currentSecurityCode?.toUpperCase()}`,
                  )
                }
                className="h-12 w-full rounded-xl bg-primary text-white font-medium text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/30 active:translate-y-0 transition-all"
              >
                Go to Login
              </Button>
            </div>
          </AuthLayout>
        </>
      );
    }

    if (approvalState === 'rejected') {
      return (
        <>
          <SEO
            title="Registration Rejected"
            description="Unfortunately, your registration was not approved."
            keywords="registration rejected, finflo application status"
          />
          <AuthLayout showLogo backToLanding={false}>
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-destructive/10 border border-destructive/20 rounded-full flex items-center justify-center mx-auto text-destructive animate-in zoom-in duration-500">
                <XCircle size={40} />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl lg:text-[2rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                  Not Approved
                </h2>
                <p className="text-slate-500 dark:text-white/70 text-sm leading-relaxed">
                  Unfortunately, your registration wasn&apos;t approved at this
                  time.
                </p>
                {rejectionReason && (
                  <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-left">
                    <p className="text-xs font-bold text-destructive uppercase tracking-wide mb-1">
                      Reason
                    </p>
                    <p className="text-sm font-medium text-destructive/90">
                      {rejectionReason}
                    </p>
                  </div>
                )}
                <p className="text-slate-500 dark:text-white/70 text-xs leading-relaxed pt-2">
                  Please contact the business administrator for assistance.
                </p>
              </div>

              <Button
                onClick={() =>
                  navigate(
                    `/member/login?code=${currentSecurityCode?.toUpperCase()}`,
                  )
                }
                className="h-12 w-full rounded-xl border border-border bg-transparent text-foreground font-medium text-sm hover:bg-muted/50 active:translate-y-0 transition-all"
              >
                Back to Login
              </Button>
            </div>
          </AuthLayout>
        </>
      );
    }

    // Default: pending / waiting state
    const reviewSteps = [
      {
        status: 'done',
        label: 'Application submitted',
        desc: 'We received your details securely.',
      },
      {
        status: 'active',
        label: 'Under review',
        desc: 'The admin team is verifying your information.',
      },
      {
        status: 'pending',
        label: 'Decision',
        desc: "You'll be notified here the moment it's ready.",
      },
    ];
    return (
      <>
        <SEO
          title="Application Pending"
          description="Your registration is currently being reviewed by the administration."
          keywords="finflo pending, application review, registration status"
        />
        <AuthLayout showLogo backToLanding={false}>
          <div className="space-y-7 text-center">
            {/* Live, pulsing status icon */}
            <div className="relative w-20 h-20 mx-auto animate-in zoom-in duration-500">
                <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="relative w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
                  <CheckCircle2 size={40} />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl lg:text-[2rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                  Application Received
                </h2>
                <p className="text-slate-500 dark:text-white/70 text-sm leading-relaxed">
                  Your registration is in. Here&apos;s what happens next — no
                  need to refresh, this page updates the instant a decision is
                  made.
                </p>
              </div>

              {/* Review progress timeline */}
              <div className="text-left mx-auto w-fit">
                {reviewSteps.map((step, i) => {
                  const isLast = i === reviewSteps.length - 1;
                  return (
                    <div key={step.label} className="flex gap-3.5">
                      <div className="flex flex-col items-center">
                        {step.status === 'done' && (
                          <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                            <Check size={15} strokeWidth={3} />
                          </div>
                        )}
                        {step.status === 'active' && (
                          <div className="w-7 h-7 rounded-full border-2 border-amber-500/50 bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                            <Loader2 size={14} className="animate-spin" />
                          </div>
                        )}
                        {step.status === 'pending' && (
                          <div className="w-7 h-7 rounded-full border-2 border-border bg-muted/40 flex items-center justify-center shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                          </div>
                        )}
                        {!isLast && (
                          <div
                            className={`w-0.5 flex-1 min-h-[1.25rem] my-1 rounded-full ${
                              step.status === 'done'
                                ? 'bg-emerald-500/40'
                                : 'bg-border'
                            }`}
                          />
                        )}
                      </div>
                      <div className={isLast ? '' : 'pb-4'}>
                        <p
                          className={`text-sm font-bold leading-tight ${
                            step.status === 'pending'
                              ? 'text-muted-foreground/60'
                              : 'text-foreground'
                          }`}
                        >
                          {step.label}
                        </p>
                        <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live waiting indicator */}
              <div className="flex items-center justify-center gap-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400 py-2 px-4 rounded-full bg-amber-500/10 border border-amber-500/20 w-fit mx-auto">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                <span>Waiting for admin review</span>
              </div>

              {/* Shareable status link — come back and check anytime */}
              {memberIdParam && (
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-left space-y-3">
                  <div className="flex items-start gap-2">
                    <Link2 size={14} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-snug">
                      Save this link to check your status anytime — it stays
                      live even after you close this page.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg border border-border/50 bg-background/70 px-3 py-2 text-[11px] font-mono text-foreground/80">
                      {window.location.href}
                    </code>
                    <Button
                      type="button"
                      onClick={copyStatusLink}
                      className="h-9 shrink-0 gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary/90 active:translate-y-0 transition-all"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              )}

              <Button
                onClick={() =>
                  navigate(
                    `/member/login?code=${currentSecurityCode?.toUpperCase()}`,
                  )
                }
                className="h-12 w-full rounded-xl bg-primary text-white font-medium text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/30 active:translate-y-0 transition-all"
              >
                Return to Login
              </Button>
            </div>
          </AuthLayout>
        </>
    );
  }

  return (
    <>
      <SEO
        title="Join Finflo"
        description="Create your Finflo account and join our secure banking network."
        keywords="join finflo, business registration, banking member application, create finance account"
        canonical="/join"
      />
      <AuthLayout
      title="Member Application"
      description="Please fill in your valid credentials to proceed with your onboarding."
      badge="Member Access Request"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="Organization Security Code"
          htmlFor="securityCode"
          labelClassName="normal-case tracking-normal px-0 text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
          error={errors.securityCode?.message}
        >
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <ShieldCheck
                size={16}
                className="text-muted-foreground group-focus-within:text-emerald-500 transition-colors"
              />
            </div>
            <Input
              id="securityCode"
              type="text"
              placeholder="e.g. A1B2C3"
              className="h-11 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono font-bold uppercase tracking-widest placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:font-normal"
              {...register('securityCode', {
                required: 'Security code is required.',
              })}
            />
          </div>
        </FormField>

        {/* ... remaining form fields ... */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Full Name"
            htmlFor="name"
            labelClassName="normal-case tracking-normal px-0 text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
            error={errors.name?.message}
          >
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <UserPlus
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              </div>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                className="h-11 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                {...register('name', { required: 'Name is required' })}
              />
            </div>
          </FormField>

          <FormField
            label="CNIC / ID"
            htmlFor="cnic"
            labelClassName="normal-case tracking-normal px-0 text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
            error={errors.cnic?.message}
          >
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FileText
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              </div>
              <Input
                id="cnic"
                type="text"
                placeholder="xxxxx-xxxxxxx-x"
                className="h-11 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                {...register('cnic', {
                  required: 'CNIC is required',
                  onChange: (e) => {
                    const formatted = formatCNIC(e.target.value);
                    setValue('cnic', formatted);
                  },
                })}
              />
            </div>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Phone Number"
            htmlFor="phone"
            labelClassName="normal-case tracking-normal px-0 text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
            error={errors.phone?.message}
          >
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              </div>
              <Input
                id="phone"
                type="tel"
                placeholder="0300 0000000"
                className="h-11 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                {...register('phone', { required: 'Phone is required' })}
              />
            </div>
          </FormField>

          <FormField
            label="Email Address"
            htmlFor="email"
            labelClassName="normal-case tracking-normal px-0 text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
            error={errors.email?.message}
          >
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              </div>
              <Input
                id="email"
                type="email"
                placeholder="mail@example.com"
                className="h-11 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                {...register('email', {
                  required: 'Email is required',
                  validate: (value) => {
                    const result = validateEmail(value);
                    return result.isValid || result.message;
                  },
                })}
              />
            </div>
          </FormField>
        </div>

        <FormField
          label="Security Password"
          htmlFor="password"
          labelClassName="normal-case tracking-normal px-0 text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
          error={errors.password?.message}
        >
          <PasswordInput
            id="password"
            placeholder="Create a password"
            className="h-11"
            leftIcon={
              <Lock
                size={16}
                className="text-muted-foreground group-focus-within:text-primary transition-colors"
              />
            }
            {...register('password', {
              required: 'Password is required',
            })}
          />
          <PasswordRequirements value={password} />
        </FormField>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl bg-primary text-white font-medium text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/30 active:translate-y-0 transition-all group relative flex items-center justify-center mt-4"
        >
          <span className="flex items-center justify-center gap-2 transition-all duration-300">
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Create My Account
                <ArrowRight
                  size={14}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </>
            )}
          </span>
        </Button>
      </form>

      <div className="pt-6 border-t border-border space-y-4">
        <div className="text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Already have an account?{' '}
            <Link
              to={`/member/login?code=${currentSecurityCode?.toUpperCase() || ''}`}
              className="text-primary font-semibold hover:text-primary/80 transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
    </>
  );
};

export default SelfRegister;
