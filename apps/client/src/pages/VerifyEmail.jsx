import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '@/lib/axios';
import {
  Mail,
  Loader2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { toast } from 'sonner';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      // If no email in query, maybe check local storage or redirect
      const savedUser = JSON.parse(
        localStorage.getItem('temp_user_email') || '""',
      );
      if (savedUser) setEmail(savedUser);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/verify-email', {
        email,
        code,
      });

      toast.success(data.message);

      // Store token and redirect
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      localStorage.removeItem('temp_user_email');

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
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
              Verify Email
            </CardTitle>
            <p className="text-muted-foreground text-sm font-medium">
              Enter the 6-digit code sent to{' '}
              <span className="text-foreground font-bold">{email}</span>
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-10 pt-2">
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
                htmlFor="code"
              >
                Verification Code
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  id="code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                  className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/50 focus:bg-background transition-all outline-none text-center text-xl font-black tracking-[0.5em]"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || code.length !== 6}
              variant="gradient"
              className="h-12 w-full rounded-full font-black text-[11px] uppercase tracking-widest group"
            >
              <span
                className={cn(
                  'flex items-center gap-2',
                  loading ? 'opacity-0' : 'opacity-100',
                )}
              >
                Verify & Continue{' '}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}
            </Button>

            <div className="text-center pt-4 space-y-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {resending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Resend Verification Code
              </button>

              <p className="text-xs text-muted-foreground font-medium">
                Entered wrong email?{' '}
                <Link
                  to="/register"
                  className="text-primary font-black hover:underline transition-all"
                >
                  Change Email
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Minimal Footer */}
      <div className="absolute bottom-6 left-0 w-full text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30 px-4">
          © 2026 Financial Intelligence Portal • Security is our priority
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
