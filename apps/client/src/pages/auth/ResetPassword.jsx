import { useState } from 'react';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Lock,
  ArrowRight,
  Loader2,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { validatePassword } from '@/lib/passwordPolicy';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AuthLayout from '@/layouts/AuthLayout';
import PasswordInput from '@/components/ui/PasswordInput';
import PasswordRequirements from '@/components/ui/PasswordRequirements';
import FormField from '@/components/ui/FormField';

const ResetPassword = () => {
  useDocumentTitle('Reset Password');
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm();

  const newPassword = watch('password');

  const onSubmit = async (data) => {
    const { isValid, message } = validatePassword(data.password);
    if (!isValid) {
      setError('password', { message });
      return;
    }

    setLoading(true);

    try {
      await api.put(`/auth/resetpassword/${token}`, {
        password: data.password,
      });
      setSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError('root', {
        message: err.response?.data?.message || 'Failed to reset password',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={success ? 'Success!' : 'Set New Password'}
      description={
        success
          ? 'Your password has been updated'
          : 'Please enter your new security credentials'
      }
      badge="Security Protocol"
    >
      {!success ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {errors.root && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in zoom-in-95">
              <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              {errors.root.message}
            </div>
          )}

          <FormField
            label="New Password"
            htmlFor="password"
            labelClassName="normal-case tracking-normal px-0 text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
            error={errors.password?.message}
          >
            <PasswordInput
              id="password"
              placeholder="Enter your new password"
              leftIcon={
                <Lock className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              }
              {...register('password', {
                required: 'New password is required',
              })}
            />
            <PasswordRequirements value={newPassword} />
          </FormField>

          <FormField
            label="Confirm Password"
            htmlFor="confirmPassword"
            labelClassName="normal-case tracking-normal px-0 text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
            error={errors.confirmPassword?.message}
          >
            <PasswordInput
              id="confirmPassword"
              placeholder="••••••••"
              leftIcon={
                <ShieldCheck className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              }
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) =>
                  value === newPassword || 'Passwords do not match',
              })}
            />
          </FormField>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-primary text-white font-medium text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/30 active:translate-y-0 transition-all group relative flex items-center justify-center"
            >
              <span
                className={cn(
                  'flex items-center gap-2',
                  loading ? 'opacity-0' : 'opacity-100',
                )}
              >
                Reset Password{' '}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
          <p className="text-sm text-muted-foreground font-medium leading-relaxed px-2">
            Your password has been successfully reset. Redirecting you to the
            login page...
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Login
            </Link>
          </div>
        </div>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
