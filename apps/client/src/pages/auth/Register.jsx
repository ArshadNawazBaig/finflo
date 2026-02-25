import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/lib/axios';
import { User, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { cn, validateEmail } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/AuthLayout';

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

    const emailValidation = validateEmail(payload.email);
    if (!emailValidation.isValid) {
      setError(emailValidation.message);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.post('/auth/register', payload);
      localStorage.setItem('temp_user_email', JSON.stringify(payload.email));
      navigate(`/verify-email?email=${encodeURIComponent(payload.email)}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-primary focus:bg-background transition-all outline-none text-sm font-medium"
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
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-primary focus:bg-background transition-all outline-none text-sm font-medium"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
            htmlFor="password"
          >
            Security Password
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
              minLength={8}
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-primary focus:bg-background transition-all outline-none text-sm font-medium"
            />
          </div>
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
