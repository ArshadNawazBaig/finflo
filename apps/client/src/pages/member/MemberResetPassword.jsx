import { useState } from 'react';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '@/lib/axios';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { validatePassword } from '@/lib/passwordPolicy';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AuthLayout from '@/layouts/AuthLayout';
import PasswordInput from '@/components/ui/PasswordInput';
import PasswordRequirements from '@/components/ui/PasswordRequirements';
import FormField from '@/components/ui/FormField';

const MemberResetPassword = () => {
  useDocumentTitle('Reset Password');
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

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
      await api.put(`/member-auth/resetpassword/${token}`, {
        password: data.password,
      });
      toast.success('Password reset successful. Please login.');
      navigate('/member/login');
    } catch (err) {
      console.error('Reset password error:', err);
      setError('root', {
        message: err.response?.data?.message || 'Failed to reset password',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="New Password"
      description="Enter and confirm your secure new password."
      badge="Member Security"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errors.root && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in zoom-in-95">
            <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            {errors.root.message}
          </div>
        )}

        <FormField
          className="space-y-1.5"
          label="New Password"
          htmlFor="password"
          labelClassName="normal-case tracking-normal px-0 text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
          error={errors.password?.message}
        >
          <PasswordInput
            id="password"
            placeholder="Enter your new password"
            className="h-11"
            leftIcon={
              <Lock
                size={16}
                className="text-muted-foreground group-focus-within:text-primary transition-colors"
              />
            }
            {...register('password', {
              required: 'New password is required',
            })}
          />
          <PasswordRequirements value={newPassword} />
        </FormField>

        <FormField
          className="space-y-1.5"
          label="Confirm Password"
          htmlFor="confirmPassword"
          labelClassName="normal-case tracking-normal px-0 text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            placeholder="••••••••"
            className="h-11"
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

        <Button
          type="submit"
          isLoading={loading}
          className="h-12 w-full rounded-xl bg-primary text-white font-medium text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/30 active:translate-y-0 transition-all flex items-center justify-center mt-4"
        >
          Update Password
          <ArrowRight
            size={14}
            className="group-hover:translate-x-1 transition-transform ml-2"
          />
        </Button>
      </form>
    </AuthLayout>
  );
};

export default MemberResetPassword;
