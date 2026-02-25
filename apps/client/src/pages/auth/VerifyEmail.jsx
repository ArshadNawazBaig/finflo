import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '@/lib/axios';
import { Loader2, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AuthLayout from '@/layouts/AuthLayout';

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
    <AuthLayout
      title="Verify Email"
      description={`Enter the 6-digit code sent to ${email}`}
      badge="Security Check"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
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
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-primary/50 focus:bg-background transition-all outline-none text-center text-xl font-black tracking-[0.5em]"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || code.length !== 6}
          variant="gradient"
          className="h-12 w-full rounded-xl font-black text-[11px] uppercase tracking-widest group relative shadow-lg shadow-primary/10"
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

        <div className="text-center pt-4 space-y-4">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
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
    </AuthLayout>
  );
};

export default VerifyEmail;
