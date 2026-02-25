import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AuthLayout from '@/layouts/AuthLayout';
import PasswordInput from '@/components/ui/PasswordInput';

const ForcePasswordChange = ({ isMember = false }) => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState('');

  const endpointBase = isMember ? '/member-auth' : '/auth';
  const dashboardPath = isMember ? '/member/dashboard' : '/dashboard';

  const user = JSON.parse(
    localStorage.getItem(isMember ? 'member' : 'user') || '{}',
  );

  useEffect(() => {
    // If no token, redirect to login
    const token = localStorage.getItem(isMember ? 'memberToken' : 'token');
    if (!token) {
      navigate(isMember ? '/member/login' : '/login');
    }
  }, [navigate, isMember]);

  const handleSendCode = async () => {
    setSendingCode(true);
    setError('');
    try {
      await api.post(`${endpointBase}/request-password-change-code`);
      toast.success('Security code sent to your email');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send code');
      toast.error(err.response?.data?.message || 'Failed to send code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyAndChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (newPassword.length < 8) {
      return setError('Password must be at least 8 characters');
    }

    setLoading(true);
    setError('');
    try {
      await api.post(`${endpointBase}/force-change-password`, {
        code,
        newPassword,
      });
      toast.success('Password changed successfully!');

      // Update local storage to clear mustChangePassword flag
      const updatedUser = { ...user, mustChangePassword: false };
      localStorage.setItem(
        isMember ? 'member' : 'user',
        JSON.stringify(updatedUser),
      );

      navigate(dashboardPath);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
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
      <form onSubmit={handleVerifyAndChange} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in zoom-in-95">
            <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Security Code (from Email)
              </label>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode}
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-70 disabled:opacity-50 transition-all"
              >
                {sendingCode ? 'Sending...' : 'Send/Resend Code'}
              </button>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <KeyRound
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              </div>
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-primary/50 focus:bg-background transition-all outline-none text-sm font-bold tracking-[0.2em] text-center"
              />
            </div>
          </div>

          <hr className="border-border/50" />

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              New Password
            </label>
            <PasswordInput
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              leftIcon={
                <Lock
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Confirm New Password
            </label>
            <PasswordInput
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              leftIcon={
                <ShieldCheck
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              }
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || code.length < 6}
          variant="gradient"
          className="h-12 w-full rounded-xl font-black text-[11px] uppercase tracking-widest group relative overflow-hidden"
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
