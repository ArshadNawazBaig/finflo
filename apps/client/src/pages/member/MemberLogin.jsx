import { useState, useEffect } from 'react';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '@/lib/axios';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  Mail,
  IdCard,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/AuthLayout';
import PasswordInput from '@/components/ui/PasswordInput';
import { GoogleLogin } from '@react-oauth/google';
import { useSetAtom } from 'jotai';
import { memberAtom } from '@/atoms';
import { cn } from '@/lib/utils';
import { markAppUnlocked } from '@/lib/appLock';
import { EMAIL_AUTH_ENABLED } from '@/lib/constants';

const MemberLogin = () => {
  useDocumentTitle('Member Login');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const setMember = useSetAtom(memberAtom);

  // 2FA state
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [pendingToken, setPendingToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');

  // Google Registration State
  const [googleAuthData, setGoogleAuthData] = useState(null); // { requiresRegistration, email, name, googleId, profilePicture }
  const [googleToken, setGoogleToken] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      securityCode: searchParams.get('code')?.toUpperCase() || '',
    },
  });

  const securityCodeValue = watch('securityCode');

  // Handle auto-population if URL changes
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setValue('securityCode', code.toUpperCase());
    }
  }, [searchParams, setValue]);

  const handleLoginSuccess = (responseData) => {
    if (responseData.twoFactorRequired) {
      setTwoFactorRequired(true);
      setPendingToken(responseData.pendingToken);
      setLoading(false);
      return;
    }

    if (responseData.mustChangePassword) {
      markAppUnlocked();
      setMember(responseData);
      navigate('/member/force-password-change');
      return;
    }

    markAppUnlocked();
    setMember(responseData);
    navigate('/member/dashboard');
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const { data: responseData } = await api.post('/member-auth/login', {
        securityCode: data.securityCode,
        email: data.email.trim(),
        password: data.password,
      });

      handleLoginSuccess(responseData);
    } catch (err) {
      console.error('Login error:', err);
      setError('root', {
        message: err.response?.data?.message || 'Invalid credentials',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!securityCodeValue || securityCodeValue.length < 3) {
      setError('securityCode', {
        message: 'Business Security Code is required for Google Sign-In',
      });
      return;
    }

    setLoading(true);
    setGoogleToken(credentialResponse.credential);
    try {
      const { data: responseData } = await api.post(
        '/member-auth/google-login',
        {
          googleToken: credentialResponse.credential,
          securityCode: securityCodeValue,
        },
      );

      handleLoginSuccess(responseData);
    } catch (err) {
      if (
        err.response?.status === 404 &&
        err.response?.data?.requiresRegistration
      ) {
        setGoogleAuthData(err.response.data);
      } else {
        setError('root', {
          message:
            err.response?.data?.message || 'Google authentication failed',
        });
      }
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
    if (!securityCodeValue || securityCodeValue.length < 3) {
      setError('securityCode', {
        message: 'Business Security Code is required for Google Sign-In',
      });
      return;
    }

    setLoading(true);
    try {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
      console.log('[GoogleAuth] Member: Initializing with clientId:', import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID);
      // Android's requestIdToken() requires the WEB client ID, not the Android client ID
      await GoogleAuth.initialize({
        clientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
      console.log('[GoogleAuth] Member: Initialization successful, calling signIn...');
      const googleUser = await GoogleAuth.signIn();
      console.log('[GoogleAuth] Member: Sign-in success, idToken present:', !!googleUser?.authentication?.idToken);
      const { data: responseData } = await api.post(
        '/member-auth/google-login',
        {
          googleToken: googleUser.authentication.idToken,
          securityCode: securityCodeValue,
        },
      );

      handleLoginSuccess(responseData);
    } catch (err) {
      console.error('[GoogleAuth] Member Sign-In error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      if (err?.message?.includes('canceled') || err?.message?.includes('cancelled') || err?.message === 'User cancelled login') {
        setLoading(false);
        return;
      }
      
      if (
        err.response?.status === 404 &&
        err.response?.data?.requiresRegistration
      ) {
        setGoogleAuthData(err.response.data);
      } else {
        const errorDetail = err?.message || err?.errorMessage || JSON.stringify(err);
        setError('root', {
          message:
            err.response?.data?.message || `Google sign-in failed: ${errorDetail}`,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const onGoogleRegisterSubmit = async (data) => {
    const { cnic, phone } = data;

    setLoading(true);
    try {
      const { data: responseData } = await api.post(
        '/member-auth/google-register',
        {
          googleToken,
          securityCode: securityCodeValue,
          cnic,
          phone,
        },
      );

      // Successfully registered, now pending approval
      setGoogleAuthData({
        ...googleAuthData,
        successMessage: responseData.message,
      });
    } catch (err) {
      setError('root', {
        message: err.response?.data?.message || 'Google registration failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setOtpError('');
    setLoading(true);
    try {
      const { data } = await api.post('/member-auth/2fa/verify-login', {
        pendingToken,
        code: otpCode,
      });

      markAppUnlocked();
      setMember(data);
      navigate('/member/dashboard');
    } catch (err) {
      console.error('2FA verification error:', err);
      setOtpError(err.response?.data?.message || 'Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  };

  // 1. Two-Factor Flow
  if (twoFactorRequired) {
    return (
      <AuthLayout
        title="Security Check"
        description="Enter your 6-digit authentication code"
        badge="Security Verification"
      >
        <form onSubmit={handleVerify2FA} className="space-y-6">
          {otpError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold p-3 rounded-xl flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              {otpError}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              </div>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
                autoFocus
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-mono tracking-[0.5em] text-center"
              />
            </div>
          </div>

          <Button
            type="submit"
            isLoading={loading}
            disabled={otpCode.length !== 6}
            className="h-12 w-full rounded-xl bg-primary text-white font-medium text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/30 active:translate-y-0 transition-all group relative flex items-center justify-center"
          >
            Verify Code{' '}
            <ArrowRight
              size={14}
              className="group-hover:translate-x-1 transition-transform ml-2"
            />
          </Button>

          <button
            type="button"
            onClick={() => {
              setTwoFactorRequired(false);
              setOtpCode('');
              setOtpError('');
            }}
            className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            disabled={loading}
          >
            Use different account
          </button>
        </form>
      </AuthLayout>
    );
  }

  // 2. Google Extra Fields Registration Flow
  if (googleAuthData) {
    if (googleAuthData.successMessage) {
      return (
        <AuthLayout
          title="Registration Successful"
          description={googleAuthData.successMessage}
          badge="Pending Approval"
        >
          <div className="text-center pt-4">
            <Button
              onClick={() => {
                setGoogleAuthData(null);
                setGoogleToken(null);
              }}
              variant="outline"
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </AuthLayout>
      );
    }

    return (
      <AuthLayout
        title="Complete Registration"
        description="Please provide a few more details to finish setting up your account."
        badge="Almost There"
      >
        <form
          onSubmit={handleSubmit(onGoogleRegisterSubmit)}
          className="space-y-4"
        >
          {errors.root && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold p-3 rounded-xl flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              {errors.root.message}
            </div>
          )}

          <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border">
            {googleAuthData.profilePicture ? (
              <img
                src={googleAuthData.profilePicture}
                alt="Profile"
                className="w-10 h-10 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {googleAuthData.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-bold">{googleAuthData.name}</p>
              <p className="text-xs text-muted-foreground">
                {googleAuthData.email}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
              htmlFor="cnic"
            >
              CNIC Number
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <IdCard
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              </div>
              <input
                id="cnic"
                type="text"
                placeholder="12345-1234567-1"
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-medium"
                {...register('cnic', {
                  required: 'CNIC is required',
                  onChange: (e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length > 13) val = val.slice(0, 13);
                    let formatted = val;
                    if (val.length > 5 && val.length <= 12) {
                      formatted = `${val.slice(0, 5)}-${val.slice(5)}`;
                    } else if (val.length > 12) {
                      formatted = `${val.slice(0, 5)}-${val.slice(5, 12)}-${val.slice(12)}`;
                    }
                    e.target.value = formatted;
                  },
                  pattern: {
                    value: /^[0-9]{5}-[0-9]{7}-[0-9]{1}$/,
                    message: 'Invalid CNIC format',
                  },
                })}
              />
            </div>
            {errors.cnic && (
              <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                {errors.cnic.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
              Authenticator Code
            </label>
            <label
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
              htmlFor="phone"
            >
              Phone Number
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              </div>
              <input
                id="phone"
                type="tel"
                placeholder="0300-1234567"
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-medium"
                {...register('phone', {
                  required: 'Phone number is required',
                })}
              />
            </div>
            {errors.phone && (
              <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                {errors.phone.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            isLoading={loading}
            className="h-12 w-full rounded-xl bg-primary text-white font-medium text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/30 active:translate-y-0 transition-all mt-4"
          >
            Complete Registration
          </Button>

          <button
            type="button"
            onClick={() => {
              setGoogleAuthData(null);
              setGoogleToken(null);
            }}
            className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mt-4"
          >
            Cancel
          </button>
        </form>
      </AuthLayout>
    );
  }

  // 3. Main Login Flow
  return (
    <AuthLayout
      title="Member Portal"
      description="Securely access your investments and loans"
      badge="Member Gateway"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errors.root && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in zoom-in-95">
            <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            {errors.root.message}
          </div>
        )}

        <div className="space-y-1.5">
          <label
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
            htmlFor="securityCode"
          >
            Business Security Code
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <ShieldCheck
                size={16}
                className="text-muted-foreground group-focus-within:text-emerald-500 transition-colors"
              />
            </div>
            <input
              id="securityCode"
              type="text"
              placeholder="e.g. ABC123"
              maxLength={6}
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none text-sm font-mono font-bold uppercase tracking-widest"
              {...register('securityCode', {
                required: 'Business security code is required',
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
            />
          </div>
          {errors.securityCode && (
            <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
              {errors.securityCode.message}
            </p>
          )}
        </div>

        {EMAIL_AUTH_ENABLED && (
          <>
        <div className="space-y-1.5">
          <label
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
            htmlFor="email"
          >
            Email Address
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail
                size={16}
                className="text-muted-foreground group-focus-within:text-primary transition-colors"
              />
            </div>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-medium"
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

        <div className="space-y-1.5">
          <div className="flex justify-between items-center ml-1">
            <label
              className="text-xs font-semibold text-slate-500 dark:text-slate-400"
              htmlFor="password"
            >
              Password
            </label>
            <Link
              to="/member/forgot-password"
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Recovery
            </Link>
          </div>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            className="h-11"
            leftIcon={
              <Lock
                size={16}
                className="text-muted-foreground group-focus-within:text-primary transition-colors"
              />
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
          isLoading={loading}
          className="h-12 w-full rounded-xl bg-primary text-white font-medium text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/30 active:translate-y-0 transition-all group relative flex items-center justify-center mt-4"
        >
          Sign In to Portal
          <ArrowRight
            size={14}
            className="group-hover:translate-x-1 transition-transform ml-2"
          />
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
          </>
        )}

        <div className="pt-2 text-center w-full flex flex-col items-center">
          <p className="text-[10px] text-muted-foreground/70 mb-4 max-w-[280px] leading-relaxed">
            {!securityCodeValue || securityCodeValue.length < 6
              ? 'Enter your 6-digit Business Security Code first to enable Google Sign In'
              : 'Use your Google account to securely access your member portal'}
          </p>

          <div
            className={cn(
              'w-full flex justify-center',
              (!securityCodeValue || securityCodeValue.length < 6) &&
                'opacity-50 pointer-events-none'
            )}
          >
            {(() => {
              const platform = window.Capacitor?.getPlatform?.();
              const isNative = platform === 'android' || platform === 'ios';
              if (isNative) {
                return (
                  <Button
                    type="button"
                    onClick={signInWithGoogleNative}
                    variant="outline"
                    className="h-12 w-full rounded-xl border-border bg-background shadow-sm hover:bg-accent flex items-center justify-center gap-3 group transition-all"
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
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">
                      Sign in with Google
                    </span>
                  </Button>
                );
              }
              return (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  shape="pill"
                  size="large"
                  theme="outline"
                  width="100%"
                />
              );
            })()}
          </div>
        </div>

        <div className="text-center pt-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center gap-1.5">
            Not a member yet?
            <Link
              to={`/join`}
              className="text-primary font-semibold hover:text-primary/80 transition-colors"
            >
              Sign up here.
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
};

export default MemberLogin;
