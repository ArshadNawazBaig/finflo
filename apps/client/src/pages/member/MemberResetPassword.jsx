import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/axios';
import { Lock, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AuthLayout from '@/layouts/AuthLayout';
import PasswordInput from '@/components/ui/PasswordInput';

const MemberResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/member-auth/resetpassword/${token}`, { password });
      toast.success('Password reset successful. Please login.');
      navigate('/member/login');
    } catch (err) {
      console.error('Reset password error:', err);
      toast.error(err.response?.data?.message || 'Failed to reset password');
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
            htmlFor="password"
          >
            New Password
          </label>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11"
            leftIcon={
              <Lock
                size={16}
                className="text-muted-foreground group-focus-within:text-primary transition-colors"
              />
            }
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
            htmlFor="confirmPassword"
          >
            Confirm Password
          </label>
          <PasswordInput
            id="confirmPassword"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="h-11"
            leftIcon={
              <ShieldCheck
                size={16}
                className="text-muted-foreground group-focus-within:text-primary transition-colors"
              />
            }
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          variant="gradient"
          className="h-12 w-full rounded-xl font-black text-[10px] uppercase tracking-widest group mt-4 overflow-hidden relative shadow-lg shadow-primary/10"
        >
          <span
            className={cn(
              'flex items-center justify-center gap-2 transition-all duration-300',
              loading ? 'opacity-0' : 'opacity-100',
            )}
          >
            Update Password
            <ArrowRight
              size={14}
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

export default MemberResetPassword;
