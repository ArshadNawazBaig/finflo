import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import Logo from '@/components/Logo';

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
              {submitted ? 'Check Email' : 'Recover Access'}
            </CardTitle>
            <p className="text-muted-foreground text-sm font-medium">
              {submitted
                ? "We've sent recovery instructions to your registered email"
                : 'Enter your credentials to reset your security credentials'}
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-10 pt-2">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                  htmlFor="securityCode"
                >
                  Business Security Code
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    id="securityCode"
                    type="text"
                    placeholder="e.g., ABC123"
                    value={securityCode}
                    onChange={(e) =>
                      setSecurityCode(e.target.value.toUpperCase())
                    }
                    required
                    maxLength={6}
                    className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/50 focus:bg-background transition-all outline-none text-sm font-medium uppercase"
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
                    <Mail className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/50 focus:bg-background transition-all outline-none text-sm font-medium"
                  />
                </div>
              </div>

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
                  Send Reset Link{' '}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to Login
                </Link>
              </div>
            </form>
          ) : (
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Please check your registered inbox. Don't forget to check your
                  spam folder if you don't see the email.
                </p>
              </div>
              <Button
                onClick={() => setSubmitted(false)}
                variant="outline"
                className="h-12 w-full rounded-full font-black text-[11px] uppercase tracking-widest border-border/50 hover:bg-muted/50"
              >
                Try Another Email
              </Button>
              <div className="text-center">
                <Link
                  to="/member/login"
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="absolute bottom-6 left-0 w-full text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30 px-4">
          © 2026 Financial Intelligence Portal
        </p>
      </div>
    </div>
  );
};

export default MemberForgotPassword;
