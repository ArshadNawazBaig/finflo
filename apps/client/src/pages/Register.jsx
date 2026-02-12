import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { User, Mail, Lock, Loader2, UserPlus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const payload = {
      ...formData,
      name: formData.name.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
    };
    try {
      const { data } = await api.post('/auth/register', payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));

      // Check for redirect param
      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get('redirect');

      if (redirect) {
        navigate(redirect);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
              Create Account
            </CardTitle>
            <p className="text-muted-foreground text-sm font-medium">
              Join the financial intelligence revolution
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-10 pt-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in zoom-in-95">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                {error}
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
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/50 focus:bg-background transition-all outline-none text-sm font-medium"
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
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/50 focus:bg-background transition-all outline-none text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                htmlFor="password"
              >
                Security Code
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
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
        </CardContent>
      </Card>

      {/* Minimal Footer */}
      <div className="absolute bottom-6 left-0 w-full text-center px-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30">
          © 2026 Financial Intelligence Portal • Precision in every transaction
        </p>
      </div>
    </div>
  );
};

export default Register;
