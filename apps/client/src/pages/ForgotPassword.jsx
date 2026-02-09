import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  ArrowRight,
  Loader2,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data } = await api.post('/auth/forgotpassword', { email });
      setMessage('Recovery instructions have been sent to your email.');
      setSubmitted(true);

      // In development, we might want to see the token if provided
      if (data.resetToken) {
        console.log('Development Reset Token:', data.resetToken);
      }
    } catch (err) {
      const detail = err.response?.data?.error
        ? `: ${err.response.data.error}`
        : '';
      setError(
        (err.response?.data?.message || 'Failed to send recovery email') +
          detail,
      );
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

        <CardHeader className="space-y-4 pt-10 px-8 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-sm group">
            <ShieldCheck className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {submitted ? 'Check Email' : 'Recover Access'}
            </CardTitle>
            <p className="text-muted-foreground text-sm font-medium">
              {submitted
                ? 'We have sent password recovery instructions'
                : 'Enter your email to reset your security code'}
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-10 pt-2">
          {!submitted ? (
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

              <div className="pt-2">
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
                    Send Instructions{' '}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
              <p className="text-sm text-muted-foreground leading-relaxed px-2">
                {message}
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to Login
                </Link>
              </div>
            </div>
          )}

          {!submitted && (
            <div className="mt-8 text-center">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Back to Sign In
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Minimal Footer */}
      <div className="absolute bottom-6 left-0 w-full text-center px-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30">
          © 2026 Financial Intelligence Portal • Integrity in recovery
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
