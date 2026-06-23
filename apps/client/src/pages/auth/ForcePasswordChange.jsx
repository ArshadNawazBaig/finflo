/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect } from 'react';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Lock, KeyRound, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validatePassword } from '@/lib/passwordPolicy';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import AuthLayout from '@/layouts/AuthLayout';
import PasswordInput from '@/components/ui/PasswordInput';
import PasswordRequirements from '@/components/ui/PasswordRequirements';
import FormField from '@/components/ui/FormField';

const ForcePasswordChange = ({ isMember = false }) => {
  useDocumentTitle('Change Password');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const endpointBase = isMember ? '/member-auth' : '/auth';
  const dashboardPath = isMember ? '/member/dashboard' : '/dashboard';

  const user = JSON.parse(
    localStorage.getItem(isMember ? 'member' : 'user') || '{}',
  );

  useEffect(() => {
    const userData = localStorage.getItem(isMember ? 'member' : 'user');
    if (!userData) {
      navigate(isMember ? '/member/login' : '/login');
    }
  }, [navigate, isMember]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm();

  const newPassword = watch('newPassword');

  const handleSendCode = async () => {
    setSendingCode(true);
    try {
      await api.post(`${endpointBase}/request-password-change-code`);
      toast.success('Security code sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send code');
    } finally {
      setSendingCode(false);
    }
  };

  const onSubmit = async (data) => {
    const { isValid, message } = validatePassword(data.newPassword);
    if (!isValid) {
      setError('newPassword', { message });
      return;
    }

    setLoading(true);
    try {
      await api.post(`${endpointBase}/force-change-password`, {
        code: data.code,
        newPassword: data.newPassword,
      });
      toast.success('Password changed successfully!');

      const updatedUser = { ...user, mustChangePassword: false };
      localStorage.setItem(
        isMember ? 'member' : 'user',
        JSON.stringify(updatedUser),
      );

      navigate(dashboardPath);
    } catch (err) {
      setError('root', {
        message: err.response?.data?.message || 'Failed to change password',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Security Update Required"
      description="Your account was created by an administrator. For your security, please verify your email and set a new password."
      badge="Mandatory Security Update"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {errors.root && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in zoom-in-95">
            <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            {errors.root.message}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Security Code (from Email)
              </label>
              <Button
                type="button"
                variant="ghost"
                onClick={handleSendCode}
                disabled={sendingCode}
                className="text-xs font-semibold text-primary hover:text-primary/80 disabled:opacity-50 transition-all"
              >
                {sendingCode ? 'Sending...' : 'Send/Resend Code'}
              </Button>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <KeyRound
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              </div>
              <Input
                type="text"
                placeholder="000000"
                maxLength={6}
                className="h-12 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-bold tracking-[0.2em] text-center"
                {...register('code', {
                  required: 'Security code is required',
                  minLength: { value: 6, message: 'Code must be 6 digits' },
                  pattern: {
                    value: /^\d{6}$/,
                    message: 'Code must be 6 digits',
                  },
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(/\D/g, '');
                  },
                })}
              />
            </div>
            {errors.code && (
              <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                {errors.code.message}
              </p>
            )}
          </div>

          <hr className="border-border/50" />

          <FormField
            label="New Password"
            htmlFor="newPassword"
            labelClassName="normal-case tracking-normal px-0 text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
            error={errors.newPassword?.message}
          >
            <PasswordInput
              id="newPassword"
              placeholder="Enter your new password"
              leftIcon={
                <Lock
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              }
              {...register('newPassword', {
                required: 'New password is required',
              })}
            />
            <PasswordRequirements value={newPassword} />
          </FormField>

          <FormField
            label="Confirm New Password"
            htmlFor="confirmPassword"
            labelClassName="normal-case tracking-normal px-0 text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
            error={errors.confirmPassword?.message}
          >
            <PasswordInput
              id="confirmPassword"
              placeholder="••••••••"
              leftIcon={
                <ShieldCheck
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              }
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) =>
                  value === newPassword || 'Passwords do not match',
              })}
            />
          </FormField>
        </div>

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
            Update Security Profile
            <ArrowRight
              size={16}
              className="group-hover:translate-x-1 transition-transform"
            />
          </span>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default ForcePasswordChange;
