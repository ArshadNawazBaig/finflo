import { useState, useEffect } from 'react';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Loader2,
  ArrowRight,
  UserPlus,
  FileText,
  Phone,
  Lock,
  Mail,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { useSetAtom } from 'jotai';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { memberAtom } from '@/atoms';
import { markAppUnlocked } from '@/lib/appLock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthLayout from '@/layouts/AuthLayout';
import { formatCNIC, capitalize } from '@/lib/utils';
import { validatePassword } from '@/lib/passwordPolicy';
import PasswordInput from '@/components/ui/PasswordInput';
import PasswordRequirements from '@/components/ui/PasswordRequirements';
import FormField from '@/components/ui/FormField';
import SEO from '@/components/SEO';

/**
 * Public page where an invited member completes their sign-up via a tokenized
 * link (`/member/accept-invite/:token`). Loads the invite to confirm it's
 * valid, locks the email to the invited address, and on accept either
 * auto-logs the member in (if the server returns a session token) or sends
 * them to the login screen.
 */
const AcceptInvite = () => {
  useDocumentTitle('Accept Invitation');
  const { token } = useParams();
  const navigate = useNavigate();
  const setMember = useSetAtom(memberAtom);

  const [loadingInvite, setLoadingInvite] = useState(true);
  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      phone: '',
      cnic: '',
      password: '',
      confirmPassword: '',
      address: '',
    },
  });

  const passwordValue = watch('password');

  useEffect(() => {
    let active = true;
    const fetchInvite = async () => {
      try {
        setLoadingInvite(true);
        setLoadError('');
        const { data } = await api.get(`/members/invite/${token}`);
        if (active) setInvite(data);
      } catch (err) {
        if (active) {
          setLoadError(
            err.response?.data?.message ||
              'This invitation is invalid or has expired.',
          );
        }
      } finally {
        if (active) setLoadingInvite(false);
      }
    };
    fetchInvite();
    return () => {
      active = false;
    };
  }, [token]);

  const onSubmit = async (data) => {
    const { isValid, message } = validatePassword(data.password);
    if (!isValid) {
      setError('password', { message });
      return;
    }

    if (data.password !== data.confirmPassword) {
      setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }

    setSubmitting(true);
    try {
      const { data: res } = await api.post(`/members/invite/${token}/accept`, {
        name: data.name.trim(),
        phone: data.phone.trim(),
        cnic: data.cnic.trim(),
        password: data.password,
        address: data.address?.trim() || undefined,
      });

      toast.success(res.message || 'Account created successfully!');

      // If the server minted a member session token, log the member in straight
      // away the same way MemberLogin does; otherwise send them to login.
      if (res.token && res.member) {
        markAppUnlocked();
        setMember({ ...res.member, token: res.token });
        navigate('/member/dashboard');
      } else {
        navigate(`/member/login?code=${res.securityCode || ''}`);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Failed to accept invitation. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInvite) {
    return (
      <>
        <SEO title="Accept Invitation" />
        <AuthLayout
          title="Loading Invitation"
          description="Please wait while we verify your invitation."
          badge="Member Invitation"
          backToLanding={false}
        >
          <div className="space-y-4 animate-pulse">
            <div className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        </AuthLayout>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <SEO title="Invitation Unavailable" />
        <AuthLayout
          title="Invitation Unavailable"
          description="We couldn't open this invitation."
          badge="Member Invitation"
          backToLanding={false}
        >
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 bg-destructive/10 border border-destructive/20 rounded-full flex items-center justify-center mx-auto text-destructive animate-in zoom-in duration-500">
              <AlertTriangle size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                This invitation is invalid or has expired
              </h2>
              <p className="text-slate-500 dark:text-white/70 text-sm leading-relaxed">
                {loadError}
              </p>
            </div>
            <Button
              asChild
              className="h-12 w-full rounded-xl bg-primary text-white font-medium text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/30 active:translate-y-0 transition-all"
            >
              <Link to="/member/login">Go to Login</Link>
            </Button>
          </div>
        </AuthLayout>
      </>
    );
  }

  return (
    <>
      <SEO
        title={`Join ${capitalize(invite?.businessName) || 'Finflo'}`}
        description="Complete your member registration to access your secure portal."
      />
      <AuthLayout
        title={`Join ${capitalize(invite?.businessName) || 'Finflo'}`}
        description="You've been invited to join. Complete your details to activate your account."
        badge="Member Invitation"
        backToLanding={false}
      >
        {invite?.businessLogo && (
          <div className="flex justify-center mb-6">
            <img
              src={invite.businessLogo}
              alt={invite.businessName || 'Business logo'}
              className="h-14 w-14 rounded-2xl object-contain border border-border bg-card p-1"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Email Address"
            htmlFor="email"
            labelClassName="normal-case tracking-normal px-0 text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
            hint="This invitation was sent to this address and can't be changed."
          >
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={16} className="text-muted-foreground" />
              </div>
              <Input
                id="email"
                type="email"
                value={invite?.email || ''}
                readOnly
                disabled
                className="h-11 pl-11 pr-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium cursor-not-allowed opacity-80"
              />
            </div>
          </FormField>

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
                      setValue('cnic', formatCNIC(e.target.value));
                    },
                  })}
                />
              </div>
            </FormField>
          </div>

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
            label="Address"
            htmlFor="address"
            labelClassName="normal-case tracking-normal px-0 text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
            hint="Optional"
            error={errors.address?.message}
          >
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              </div>
              <Input
                id="address"
                type="text"
                placeholder="House, street, city"
                className="h-11 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                {...register('address')}
              />
            </div>
          </FormField>

          <FormField
            label="Password"
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
            <PasswordRequirements value={passwordValue} />
          </FormField>

          <FormField
            label="Confirm Password"
            htmlFor="confirmPassword"
            labelClassName="normal-case tracking-normal px-0 text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
            error={errors.confirmPassword?.message}
          >
            <PasswordInput
              id="confirmPassword"
              placeholder="Re-enter your password"
              className="h-11"
              leftIcon={
                <Lock
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              }
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) =>
                  value === passwordValue || 'Passwords do not match',
              })}
            />
          </FormField>

          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-xl bg-primary text-white font-medium text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/30 active:translate-y-0 transition-all group relative flex items-center justify-center mt-4"
          >
            <span className="flex items-center justify-center gap-2">
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Activate My Account
                  <ArrowRight
                    size={14}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </span>
          </Button>
        </form>

        <div className="pt-6 border-t border-border mt-6 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Already have an account?{' '}
            <Link
              to="/member/login"
              className="text-primary font-semibold hover:text-primary/80 transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </AuthLayout>
    </>
  );
};

export default AcceptInvite;
