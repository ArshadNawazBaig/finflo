import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '@/lib/axios';
import { User, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import PasswordInput from '@/components/ui/PasswordInput';
import { cn, validateEmail, validatePassword } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/AuthLayout';

const Register = () => {
  const navigate = useNavigate();
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
          className="h-12 w-full rounded-xl font-black text-[11px] uppercase tracking-widest group relative shadow-lg shadow-primary/10"
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
