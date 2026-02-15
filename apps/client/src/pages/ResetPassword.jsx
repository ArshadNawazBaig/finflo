import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  ArrowRight,
  Loader2,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Logo from '@/components/Logo';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters long');
    }

    setLoading(true);
    setError('');

    try {
      await api.put(`/auth/resetpassword/${token}`, {
        password: formData.password,
      });
      setSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Dynamic Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

      <Card className="w-full max-w-md relative z-10 glass dark:glass-dark border-border/50 shadow-sm rounded-[2.5rem] overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-emerald-400 to-primary/50" />

        <CardHeader className="space-y-4 pt-10 px-8 text-center flex flex-col items-center">
          <Link to="/" className="mb-2">
            <Logo showText={false} className="h-12" />
          </Link>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {success ? 'Success!' : 'Set New Password'}
            </CardTitle>
            <p className="text-muted-foreground text-sm font-medium">
              {success
                ? 'Your password has been updated'
                : 'Please enter your new security credentials'}
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-10 pt-2">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in zoom-in-95">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                  htmlFor="password"
                >
                  New Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/50 focus:bg-background transition-all outline-none text-sm font-medium"
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
                    <ShieldCheck className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/50 focus:bg-background transition-all outline-none text-sm font-medium"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  variant="gradient"
                  className="h-12 w-full rounded-full font-black text-[11px] uppercase tracking-widest group"
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
              <p className="text-sm text-muted-foreground leading-relaxed px-2">
                Your password has been successfully reset. Redirecting you to
                the login page...
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to Login
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Minimal Footer */}
      <div className="absolute bottom-6 left-0 w-full text-center px-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30">
          © 2026 Financial Intelligence Portal • Secure Gateway
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
