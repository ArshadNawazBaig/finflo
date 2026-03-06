import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '@/lib/axios';
import PasswordInput from '@/components/ui/PasswordInput';
import {
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AuthLayout from '@/layouts/AuthLayout';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 2FA step state
  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingToken, setPendingToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    const lowercaseEmail = data.email.trim().toLowerCase();
    try {
      const { data: responseData } = await api.post('/auth/login', {
        email: lowercaseEmail,
        password: data.password,
      });

      if (responseData.requires2FA) {
        setPendingToken(responseData.pendingToken);
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      if (responseData.mustChangePassword) {
        localStorage.setItem('user', JSON.stringify(responseData));
        navigate('/force-password-change');
        return;
      }

      localStorage.setItem('user', JSON.stringify(responseData));

      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get('redirect');
      if (redirect) {
        navigate(redirect);
        return;
      }

      if (responseData.role === 'super_admin') {
        navigate('/super-admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response?.data?.notVerified) {
        toast.info(err.response.data.message);
        navigate(
          `/verify-email?email=${encodeURIComponent(err.response.data.email)}`,
        );
        return;
      }
      setError('root', {
        message: err.response?.data?.message || 'Login failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setOtpError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login/verify-2fa', {
        pendingToken,
        code: otpCode.trim(),
      });
      localStorage.setItem('user', JSON.stringify(data));
      if (data.role === 'super_admin') {
        navigate('/super-admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || '2FA verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={requires2FA ? 'Two-Factor Auth' : 'Welcome Back'}
      description={
        requires2FA
          ? 'Enter the 6-digit code from your authenticator app'
          : 'Securely access your financial portfolio'
      }
      badge={requires2FA ? 'Security Protocol' : 'Admin Portal Access'}
    >
      {requires2FA ? (
        <form onSubmit={handle2FASubmit} className="space-y-5">
          {otpError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in zoom-in-95">
              <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              {otpError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Authenticator Code
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <KeyRound className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/20 border border-border focus:border-primary focus:bg-background transition-all outline-none text-sm font-medium tracking-widest text-center"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading || otpCode.length < 6}
            variant="gradient"
            className="h-12 w-full rounded-xl font-black text-[11px] uppercase tracking-widest group relative"
          >
            <span
              className={cn(
                'flex items-center gap-2',
                loading ? 'opacity-0' : 'opacity-100',
              )}
            >
              Verify &amp; Sign In{' '}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
          </Button>
          <button
            type="button"
            onClick={() => {
              setRequires2FA(false);
              setOtpCode('');
              setOtpError('');
            }}
            className="w-full text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Login
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {errors.root && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in zoom-in-95">
              <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              {errors.root.message}
            </div>
          )}

          <div className="space-y-2">
            <label
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
              htmlFor="email"
            >
              Email Address
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-primary focus:bg-background transition-all outline-none text-sm font-medium"
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

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                htmlFor="password"
              >
                Security Password
              </label>
              <Link
                to="/forgot-password"
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
              >
                Forgot?
              </Link>
            </div>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              leftIcon={
                <Lock className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              }
              {...register('password', {
                required: 'Password is required',
              })}
            />
            {errors.password && (
              <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            variant="gradient"
            className="h-12 w-full rounded-xl font-black text-[11px] uppercase tracking-widest group relative"
          >
            <span
              className={cn(
                'flex items-center gap-2',
                loading ? 'opacity-0' : 'opacity-100',
              )}
            >
              Sign In{' '}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
          </Button>

          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground font-medium">
              New to the platform?{' '}
              <Link
                to="/register"
                className="text-primary font-black hover:underline transition-all"
              >
                Create Account
              </Link>
            </p>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default Login;
