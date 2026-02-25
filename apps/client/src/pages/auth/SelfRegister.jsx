import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Loader2,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  FileText,
  Phone,
  Lock,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/AuthLayout';
import { formatCNIC, validateEmail } from '@/lib/utils';

/**
 * Public facing page where members can self-register given a business security code inline.
 */
const SelfRegister = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      securityCode: code?.toUpperCase() || '',
    },
  });

  const currentSecurityCode = watch('securityCode');

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      await api.post('/members/self-register', data);
      setIsSuccess(true);
      toast.success('Registration request sent successfully!');
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to register. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
        {/* Dynamic Background Blobs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

        <Card className="w-full max-w-md relative z-10 glass dark:glass-dark border-border/50 shadow-sm rounded-[2.5rem] overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />

          <CardContent className="pt-12 pb-10 px-8 space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-500 animate-in zoom-in duration-500">
              <CheckCircle2 size={40} />
            </div>

            <div className="space-y-2">
              <CardTitle className="text-2xl font-black tracking-tight">
                Application Received
              </CardTitle>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your registration has been submitted and is currently being
                reviewed by the administration. You will be able to log in once
                your account is approved.
              </p>
            </div>

            <Button
              onClick={() =>
                navigate(
                  `/member/login?code=${currentSecurityCode?.toUpperCase()}`,
                )
              }
              variant="gradient"
              className="w-full h-12 rounded-full font-black text-[11px] uppercase tracking-widest"
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AuthLayout
      title="Member Application"
      description="Please fill in your valid credentials to proceed with your onboarding."
      badge="Member Access Request"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
            Organization Security Code
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <ShieldCheck
                size={16}
                className="text-muted-foreground group-focus-within:text-emerald-500 transition-colors"
              />
            </div>
            <input
              type="text"
              placeholder="e.g. A1B2C3"
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-emerald-500 focus:bg-background transition-all outline-none text-sm font-mono font-bold uppercase tracking-widest placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:font-normal"
              {...register('securityCode', {
                required: 'Security code is required.',
              })}
            />
          </div>
          {errors.securityCode && (
            <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
              {errors.securityCode.message}
            </p>
          )}
        </div>

        {/* ... remaining form fields ... */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Full Name
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <UserPlus
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              </div>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-primary focus:bg-background transition-all outline-none text-sm font-medium"
                {...register('name', { required: 'Name is required' })}
              />
            </div>
            {errors.name && (
              <p className="text-destructive text-[10px] font-bold pl-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              CNIC / ID
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FileText
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              </div>
              <input
                type="text"
                placeholder="xxxxx-xxxxxxx-x"
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-primary focus:bg-background transition-all outline-none text-sm font-medium"
                {...register('cnic', {
                  required: 'CNIC is required',
                  onChange: (e) => {
                    const formatted = formatCNIC(e.target.value);
                    setValue('cnic', formatted);
                  },
                })}
              />
            </div>
            {errors.cnic && (
              <p className="text-destructive text-[10px] font-bold pl-1">
                {errors.cnic.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
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
                type="tel"
                placeholder="0300 0000000"
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-primary focus:bg-background transition-all outline-none text-sm font-medium"
                {...register('phone', { required: 'Phone is required' })}
              />
            </div>
            {errors.phone && (
              <p className="text-destructive text-[10px] font-bold pl-1">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
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
                type="email"
                placeholder="mail@example.com"
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-primary focus:bg-background transition-all outline-none text-sm font-medium"
                {...register('email', {
                  required: 'Email is required',
                  validate: (value) => {
                    const result = validateEmail(value);
                    return result.isValid || result.message;
                  },
                })}
              />
            </div>
            {errors.email && (
              <p className="text-destructive text-[10px] font-bold pl-1">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
            Security Password
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock
                size={16}
                className="text-muted-foreground group-focus-within:text-primary transition-colors"
              />
            </div>
            <input
              type="password"
              placeholder="Minimum 8 characters"
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-primary focus:bg-background transition-all outline-none text-sm font-medium"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
              })}
            />
          </div>
          {errors.password && (
            <p className="text-destructive text-[10px] font-bold pl-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          variant="gradient"
          className="h-12 w-full rounded-xl font-black text-[10px] uppercase tracking-widest group mt-4 overflow-hidden relative shadow-lg shadow-primary/10"
        >
          <span className="flex items-center justify-center gap-2 transition-all duration-300">
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Create My Account
                <ArrowRight
                  size={14}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </>
            )}
          </span>
        </Button>
      </form>

      <div className="pt-6 border-t border-border space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground font-medium">
            Already have an account?{' '}
            <Link
              to={`/member/login?code=${currentSecurityCode?.toUpperCase() || ''}`}
              className="text-primary font-black hover:underline transition-all"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SelfRegister;
