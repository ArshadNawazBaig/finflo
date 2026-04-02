import { useState } from 'react';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSetAtom } from 'jotai';
import api from '@/lib/axios';
import { User, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import PasswordInput from '@/components/ui/PasswordInput';
import { cn, validateEmail, validatePassword } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/AuthLayout';
import { toast } from 'sonner';
import { GoogleLogin } from '@react-oauth/google';
import { userAtom } from '@/atoms';

const Register = () => {
  useDocumentTitle('Register');
  const navigate = useNavigate();
  const setUser = useSetAtom(userAtom);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    const payload = {
      name: data.name.trim().toLowerCase(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
    };

    const emailValidation = validateEmail(payload.email);
    if (!emailValidation.isValid) {
      setError('email', { message: emailValidation.message });
      setLoading(false);
      return;
    }

    const passwordValidation = validatePassword(payload.password);
    if (!passwordValidation.isValid) {
      setError('password', { message: passwordValidation.message });
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/register', payload);
      localStorage.setItem('temp_user_email', JSON.stringify(payload.email));
      navigate(`/verify-email?email=${encodeURIComponent(payload.email)}`);
    } catch (err) {
      setError('root', {
        message: err.response?.data?.message || 'Registration failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/google-register', {
        googleToken: credentialResponse.credential,
      });

      // Auto login on successful register — update both atom and localStorage
      setUser(data);

      toast.success(data.message || 'Registration successful!');
      navigate('/dashboard');
    } catch (err) {
      setError('root', {
        message: err.response?.data?.message || 'Google registration failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('root', {
      message: 'Google Sign-Up was unsuccessful. Try again later.',
    });
  };

  const signUpWithGoogleNative = async () => {
    setLoading(true);
    try {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
      await GoogleAuth.initialize({
        clientId: import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID,
        scopes: 'profile,email'
      });
      const googleUser = await GoogleAuth.signIn();
      const { data } = await api.post(
        '/auth/google-register', {
        googleToken: googleUser.authentication.idToken,
      });

      // Auto login on successful register — update both atom and localStorage
      setUser(data);

      toast.success(data.message || 'Registration successful!');
      navigate('/dashboard');
    } catch (err) {
      if (err.name === 'Error' && err.message === 'User cancelled login') {
        return;
      }
      setError('root', {
        message: err.response?.data?.message || 'Native Google registration failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      description="Join the financial intelligence revolution"
      badge="Global Registration"
    >
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
            htmlFor="name"
          >
            Full Name
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input
              id="name"
              type="text"
              placeholder="John Doe"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-primary focus:bg-background transition-all outline-none text-sm font-medium"
              {...register('name', { required: 'Full name is required' })}
            />
          </div>
          {errors.name && (
            <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
              {errors.name.message}
            </p>
          )}
        </div>

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
          <label
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
            htmlFor="password"
          >
            Security Password
          </label>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            leftIcon={
              <Lock className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            }
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters',
              },
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
          className="h-12 w-full rounded-xl font-black text-[11px] uppercase tracking-widest group relative shadow-lg shadow-primary/10 flex items-center justify-center"
        >
          <span
            className={cn(
              'flex items-center gap-2',
              loading ? 'opacity-0' : 'opacity-100',
            )}
          >
            Create Account{' '}
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
          <div className="w-full flex justify-center">
            {(() => {
              try {
                // We check if we are on a native platform safely
                const isNative = window.Capacitor?.getPlatform() !== 'web';
                if (isNative) {
                  return (
                    <Button
                      type="button"
                      onClick={signUpWithGoogleNative}
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
                        Sign up with Google
                      </span>
                    </Button>
                  );
                }
              } catch (e) {}
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
        </div>

        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground font-medium">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary font-black hover:underline transition-all"
            >
              Sign In
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Register;
