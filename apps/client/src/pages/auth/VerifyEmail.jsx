import { useState, useEffect } from 'react';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import api from '@/lib/axios';
import { Loader2, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AuthLayout from '@/layouts/AuthLayout';
import { userAtom } from '@/atoms';

const VerifyEmail = () => {
  useDocumentTitle('Verify Email');
  const navigate = useNavigate();
  const setUser = useSetAtom(userAtom);
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      const savedUser = JSON.parse(
        localStorage.getItem('temp_user_email') || '""',
      );
      if (savedUser) setEmail(savedUser);
    }
  }, [location]);

  const onSubmit = async ({ code }) => {
    try {
      const { data } = await api.post('/auth/verify-email', {
        email,
        code,
      });

      toast.success(data.message);
      setUser(data);
      localStorage.removeItem('temp_user_email');
      navigate('/dashboard');
    } catch (err) {
      setError('root', {
        message: err.response?.data?.message || 'Verification failed',
      });
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('Email is required to resend code');
      return;
    }

    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      toast.success('Verification code resent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verify Email"
      description={`Enter the 6-digit code sent to ${email}`}
      badge="Security Check"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {errors.root && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in zoom-in-95">
            <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            {errors.root.message}
          </div>
        )}

        <div className="space-y-1.5">
          <label
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
            htmlFor="code"
          >
            Verification Code
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <ShieldCheck
                size={16}
                className="text-muted-foreground group-focus-within:text-primary transition-colors"
              />
            </div>
            <input
              id="code"
              type="text"
              placeholder="123456"
              maxLength={6}
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-center text-xl font-bold tracking-[0.5em]"
              {...register('code', {
                required: 'Verification code is required',
                minLength: { value: 6, message: 'Code must be 6 digits' },
                maxLength: { value: 6, message: 'Code must be 6 digits' },
                pattern: { value: /^\d{6}$/, message: 'Code must be 6 digits' },
              })}
              onChange={(e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
              }}
            />
          </div>
          {errors.code && (
            <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
              {errors.code.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl bg-primary text-white font-medium text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/30 active:translate-y-0 transition-all group relative flex items-center justify-center"
        >
          <span
            className={cn(
              'flex items-center gap-2',
              isSubmitting ? 'opacity-0' : 'opacity-100',
            )}
          >
            Verify & Continue{' '}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
          {isSubmitting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
        </Button>

        <div className="text-center pt-4 space-y-4">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            {resending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Resend Verification Code
          </button>

          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Entered wrong email?{' '}
            <Link
              to="/register"
              className="text-primary font-semibold hover:text-primary/80 transition-colors"
            >
              Change Email
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
};

export default VerifyEmail;
