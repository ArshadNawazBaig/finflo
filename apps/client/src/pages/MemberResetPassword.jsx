import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/axios';
import { Lock, Loader2, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
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
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Dynamic Background Blobs (Blue Theme) */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

      <Card className="w-full max-w-md relative z-10 glass dark:glass-dark border-border/50 shadow-sm rounded-[2.5rem] overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500/50" />

        <CardHeader className="space-y-4 pt-10 px-8 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-sm group">
            <KeyRound className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              New Password
            </CardTitle>
            <p className="text-muted-foreground text-sm font-medium px-4">
              Enter and confirm your secure new password.
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-10 pt-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                htmlFor="password"
              >
                New Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-blue-500/50 focus:bg-background transition-all outline-none text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                htmlFor="confirmPassword"
              >
                Confirm Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-blue-500/50 focus:bg-background transition-all outline-none text-sm font-medium"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-full font-black text-[11px] uppercase tracking-widest group bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 shadow-lg shadow-blue-500/20 transition-all"
            >
              <span
                className={cn(
                  'flex items-center gap-2',
                  loading ? 'opacity-0' : 'opacity-100',
                )}
              >
                Update Password{' '}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="absolute bottom-6 left-0 w-full text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30 px-4">
          © 2026 Financial Intelligence Portal
        </p>
      </div>
    </div>
  );
};

export default MemberResetPassword;
