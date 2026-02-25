import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/AuthLayout';

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
    <AuthLayout
      title={submitted ? 'Check Email' : 'Recover Access'}
      description={
        submitted
          ? 'We have sent password recovery instructions'
          : 'Enter your email to reset your security credentials'
      }
      badge="Security Recovery"
    >
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
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-primary/50 focus:bg-background transition-all outline-none text-sm font-medium"
              />
            </div>
          </div>

          <div className="pt-2">
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
          <p className="text-sm text-muted-foreground font-medium leading-relaxed px-2">
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
    </AuthLayout>
  );
};

export default ForgotPassword;
