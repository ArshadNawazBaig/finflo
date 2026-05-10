import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  Shield,
  Sun,
  Moon,
  Landmark,
  CreditCard,
} from 'lucide-react';
import { APP_MODE } from '@/lib/constants';
import { useTheme } from '@/context/ThemeContext';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';

const features =
  APP_MODE === 'member'
    ? [
        {
          icon: Wallet,
          label: 'Wallet',
          desc: 'Track balance & savings',
          gradient: 'from-indigo-500 to-violet-600',
          glow: 'shadow-indigo-500/25',
        },
        {
          icon: ArrowLeftRight,
          label: 'Transfers',
          desc: 'Send & receive instantly',
          gradient: 'from-emerald-500 to-teal-600',
          glow: 'shadow-emerald-500/25',
        },
        {
          icon: TrendingUp,
          label: 'Investments',
          desc: 'Grow your wealth',
          gradient: 'from-amber-500 to-orange-600',
          glow: 'shadow-amber-500/25',
        },
      ]
    : [
        {
          icon: Landmark,
          label: 'Dashboard',
          desc: 'Full business control',
          gradient: 'from-indigo-500 to-violet-600',
          glow: 'shadow-indigo-500/25',
        },
        {
          icon: CreditCard,
          label: 'Loans',
          desc: 'Manage disbursements',
          gradient: 'from-emerald-500 to-teal-600',
          glow: 'shadow-emerald-500/25',
        },
        {
          icon: TrendingUp,
          label: 'Analytics',
          desc: 'AI-powered insights',
          gradient: 'from-amber-500 to-orange-600',
          glow: 'shadow-amber-500/25',
        },
      ];

const NativeWelcomeScreen = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const loginPath = APP_MODE === 'member' ? '/member/login' : '/login';

  return (
    <div className="fixed inset-0 z-[9998] bg-background flex flex-col overflow-hidden select-none">
      {/* ── Animated Background Blobs ──────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            x: [0, 60, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          className="absolute top-[-15%] left-[-15%] w-[65%] h-[65%] rounded-full bg-primary/15 dark:bg-primary/10 blur-[140px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, -80, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-[-15%] right-[-15%] w-[65%] h-[65%] rounded-full bg-violet-500/15 dark:bg-violet-500/10 blur-[140px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            x: [0, 40, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute top-[30%] right-[-5%] w-[40%] h-[35%] rounded-full bg-pink-500/10 dark:bg-pink-500/8 blur-[120px]"
        />
      </div>

      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div
        className="relative z-30 flex items-center justify-between px-6 pt-14 pb-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="p-2.5 rounded-2xl hover:bg-muted/30 transition-all active:scale-95"
          aria-label="Toggle theme"
        >
          <motion.div
            initial={false}
            animate={{ rotate: isDark ? 180 : 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            {isDark ? (
              <Moon size={18} className="text-muted-foreground" />
            ) : (
              <Sun size={18} className="text-muted-foreground" />
            )}
          </motion.div>
        </Button>

        {/* Mode Badge */}
        <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 flex">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
            {APP_MODE === 'member' ? 'Member' : 'Business'}
          </span>
        </div>
      </motion.div>

      {/* ── Main Content ───────────────────────────────────────── */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center px-8 gap-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative"
        >
          {/* Glow ring behind logo */}
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 w-48 h-48 -m-10 rounded-full bg-primary/20 blur-3xl"
          />
          <div className="relative z-10">
            <Logo showText={true} className="" />
          </div>
        </motion.div>

        {/* Hero Text */}
        <motion.div
          className="text-center space-y-3"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            {APP_MODE === 'member' ? (
              <>
                Your Financial Life,{' '}
                <span className="text-gradient-primary">Simplified</span>
              </>
            ) : (
              <>
                Complete Business{' '}
                <span className="text-gradient-primary">Control</span>
              </>
            )}
          </h1>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-[300px] mx-auto">
            {APP_MODE === 'member'
              ? 'Manage loans, transfers, and investments — all in one secure place.'
              : 'Manage members, loans, branches, and finances from one powerful dashboard.'}
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          className="w-full max-w-sm space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          {features.map((feat, i) => (
            <motion.div
              key={feat.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.12, duration: 0.5 }}
              className={`flex items-center gap-4 p-4 rounded-2xl
                bg-white/60 dark:bg-white/[0.04]
                backdrop-blur-md
                border border-white/30 dark:border-white/[0.06]
                shadow-lg ${feat.glow}
                hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}
            >
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feat.gradient} flex items-center justify-center shadow-md flex-shrink-0`}
              >
                <feat.icon size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-foreground">
                  {feat.label}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {feat.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── Bottom CTA ─────────────────────────────────────────── */}
      <motion.div
        className="relative z-20 px-8 pb-10 pt-4 space-y-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
      >
        {/* Sign In Button */}
        <Button
          id="welcome-sign-in-btn"
          onClick={() => navigate(loginPath)}
          className="w-full h-14 rounded-2xl font-black text-[12px] uppercase tracking-[0.18em] text-white flex items-center justify-center gap-3 group relative overflow-hidden shadow-xl shadow-primary/25"
          style={{
            background:
              'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
          }}
        >
          {/* Shimmer */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
            animate={{ x: ['-200%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
          <span className="relative z-10">Sign In</span>
          <ArrowRight
            size={16}
            className="relative z-10 group-hover:translate-x-1 transition-transform"
          />
        </Button>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2">
          <Shield size={12} className="text-emerald-500" />
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/50">
            End-to-End Encrypted
          </span>
        </div>

        {/* Bottom Branding */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-border" />
          <p className="text-[8px] font-black tracking-[0.4em] text-muted-foreground/40 uppercase">
            FinFlo — The Banking OS
          </p>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-border" />
        </div>
      </motion.div>
    </div>
  );
};

export default NativeWelcomeScreen;
