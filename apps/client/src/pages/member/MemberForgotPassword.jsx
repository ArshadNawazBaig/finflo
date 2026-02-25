import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/axios';
import {
  Mail,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AuthLayout from '@/layouts/AuthLayout';

const MemberForgotPassword = () => {
  const [securityCode, setSecurityCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/member-auth/forgotpassword', {
        securityCode: securityCode.trim(),
        email: email.trim(),
      });
      setSubmitted(true);
      toast.success('Reset link sent to your registered email');
    } catch (err) {
      console.error('Forgot password error:', err);
      toast.error(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={submitted ? 'Check Email' : 'Recover Access'}
      description={
        submitted
          ? "We've sent recovery instructions to your registered email"
          : 'Enter your credentials to reset your security credentials'
      }
      badge="Member Security"
    >
      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
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
                value={securityCode}
                onChange={(e) => setSecurityCode(e.target.value.toUpperCase())}
                required
                maxLength={6}
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-emerald-500/50 focus:bg-background transition-all outline-none text-sm font-mono font-bold uppercase tracking-widest"
              />
            </div>
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
                <Mail
                  size={16}
                  className="text-muted-foreground group-focus-within:text-primary transition-colors"
                />
              </div>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-primary/50 focus:bg-background transition-all outline-none text-sm font-medium"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            variant="gradient"
            className="h-12 w-full rounded-xl font-black text-[10px] uppercase tracking-widest group mt-4 overflow-hidden relative shadow-lg shadow-primary/10"
          >
            <span
              className={cn(
                'flex items-center justify-center gap-2 transition-all duration-300',
                loading ? 'opacity-0' : 'opacity-100',
              )}
            >
              Send Reset Link
              <ArrowRight
                size={14}
                className="group-hover:translate-x-1 transition-transform"
              />
            </span>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
          </Button>

          <div className="text-center pt-2">
            <Link
              to="/member/login"
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              <ArrowLeft size={12} />
              Back to Login
            </Link>
          </div>
        </form>
      ) : (
        <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              Please check your registered inbox. Don't forget to check your
              spam folder if you don't see the email.
            </p>
          </div>
          <Button
            onClick={() => setSubmitted(false)}
            variant="outline"
            className="h-12 w-full rounded-xl font-black text-[10px] uppercase tracking-widest border-border/50 hover:bg-muted/50"
          >
            Try Another Email
          </Button>
          <div className="text-center">
            <Link
              to="/member/login"
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft size={12} />
              Back to Login
            </Link>
          </div>
        </div>
      )}
    </AuthLayout>
  );
};

export default MemberForgotPassword;
