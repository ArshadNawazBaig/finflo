import { useState } from 'react';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '@/lib/axios';
import PasswordInput from '@/components/ui/PasswordInput';
import {
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AuthLayout from '@/layouts/AuthLayout';
import { GoogleLogin } from '@react-oauth/google';
import { useSetAtom } from 'jotai';
import { userAtom } from '@/atoms';
import { Capacitor } from '@capacitor/core';
import SEO from '@/components/SEO';

const Login = () => {
  useDocumentTitle('Login');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const setUser = useSetAtom(userAtom);

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
        setUser(responseData);
        navigate('/force-password-change');
        return;
      }

      setUser(responseData);

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

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const { data: responseData } = await api.post('/auth/google-login', {
        googleToken: credentialResponse.credential,
      });

      if (responseData.requires2FA) {
        setPendingToken(responseData.pendingToken);
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      if (responseData.mustChangePassword) {
        setUser(responseData);
        navigate('/force-password-change');
        return;
      }

      setUser(responseData);

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
      if (
        err.response?.status === 404 &&
        err.response?.data?.requiresRegistration
      ) {
        toast.info('Account not found. Please register.');
        navigate('/register');
        return;
      }
      if (err.response?.data?.notVerified) {
        toast.info(err.response.data.message);
        navigate(
          `/verify-email?email=${encodeURIComponent(err.response.data.email)}`,
        );
        return;
      }
      setError('root', {
        message: err.response?.data?.message || 'Google authentication failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('root', {
      message: 'Google Sign-In was unsuccessful. Try again later.',
    });
  };

  const signInWithGoogleNative = async () => {
    setLoading(true);
    try {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
      console.log('Initializing GoogleAuth with explicit clientId and scopes...');
      await GoogleAuth.initialize({
        clientId: import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID,
        scopes: 'profile,email'
      });
      const googleUser = await GoogleAuth.signIn();
      const { data: responseData } = await api.post('/auth/google-login', {
        googleToken: googleUser.authentication.idToken,
      });

      if (responseData.requires2FA) {
        setPendingToken(responseData.pendingToken);
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      if (responseData.mustChangePassword) {
        setUser(responseData);
        navigate('/force-password-change');
        return;
      }

      setUser(responseData);

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
      console.error('Native Google Sign-In error:', err);
      if (err.name === 'Error' && err.message === 'User cancelled login') {
        return;
      }
      setError('root', {
        message: err.response?.data?.message || 'Native Google authentication failed',
      });
    } finally {
      console.log('Native Google Sign-In finished');
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
      setUser(data);
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
    <>
      <SEO
        title="Member Login"
        description="Login to your Finflo account to manage your finances, loans, and business operations."
        keywords="finflo login, member portal, business console login, secure banking access"
        canonical="/login"
      />
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
            className="h-12 w-full rounded-xl font-black text-[11px] uppercase tracking-widest group relative flex items-center justify-center"
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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center w-full space-y-4">
            {(() => {
              try {
                const isNative = window.Capacitor?.getPlatform() !== 'web';
                if (isNative) {
                  return (
                    <Button
                      type="button"
                      onClick={signInWithGoogleNative}
                      variant="outline"
                      className="h-12 w-full max-w-sm rounded-xl border-border bg-background shadow-sm hover:bg-accent flex items-center justify-center gap-3 group transition-all"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      <span className="text-[11px] font-black uppercase tracking-widest text-foreground group-hover:text-primary transition-colors">
                        Sign in with Google
                      </span>
                    </Button>
                  );
                }
              } catch (e) {
                // Fallback to web Google Login if Capacitor or plugin is not available
              }
              return (
                <div className="w-full flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    shape="pill"
                    size="large"
                    theme="outline"
                    width="100%"
                  />
                </div>
              );
            })()}
          </div>

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
    </>
  );
};

export default Login;
