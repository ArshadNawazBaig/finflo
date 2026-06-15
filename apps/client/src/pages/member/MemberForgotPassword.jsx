import { useState } from 'react';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '@/lib/axios';
import { Mail, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import AuthLayout from '@/layouts/AuthLayout';

const MemberForgotPassword = () => {
  useDocumentTitle('Forgot Password');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post('/member-auth/forgotpassword', {
        securityCode: data.securityCode.trim(),
        email: data.email.trim(),
      });
      setSubmitted(true);
      toast.success('Reset link sent to your registered email');
    } catch (err) {
      console.error('Forgot password error:', err);
      toast.error(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={submitted ? 'Check Email' : 'Recover Access'}
      description={
        submitted
          ? "We've sent recovery instructions to your registered email"
          : 'Enter your credentials to reset your security credentials'
      }
      badge="Member Security"
    >
      {!submitted ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
              htmlFor="securityCode"
            >
              Business Security Code
            </label>
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
                placeholder="e.g. ABC123"
                maxLength={6}
                className="h-11 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono font-bold uppercase tracking-widest"
                {...register('securityCode', {
                  required: 'Business security code is required',
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
              />
            </div>
            {errors.securityCode && (
              <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                {errors.securityCode.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
              htmlFor="email"
            >
              Email Address
            </label>
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
                placeholder="name@example.com"
                className="h-11 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Invalid email format',
                  },
                })}
              />
            </div>
            {errors.email && (
              <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            isLoading={loading}
            className="h-12 w-full rounded-xl bg-primary text-white font-medium text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/30 active:translate-y-0 transition-all flex items-center justify-center mt-4"
          >
            Send Reset Link
            <ArrowRight
              size={14}
              className="group-hover:translate-x-1 transition-transform ml-2"
            />
          </Button>

          <div className="text-center pt-2">
            <Link
              to="/member/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
            >
              <ArrowLeft size={12} />
              Back to Login
            </Link>
          </div>
        </form>
      ) : (
        <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              Please check your registered inbox. Don't forget to check your
              spam folder if you don't see the email.
            </p>
          </div>
          <Button
            onClick={() => setSubmitted(false)}
            className="h-12 w-full rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 active:translate-y-0 transition-all"
          >
            Try Another Email
          </Button>
          <div className="text-center">
            <Link
              to="/member/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={12} />
              Back to Login
            </Link>
          </div>
        </div>
      )}
    </AuthLayout>
  );
};

export default MemberForgotPassword;
