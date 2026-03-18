import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';

const AuthLayout = ({
  children,
  title,
  description,
  badge = 'Secure Access',
  brandingTitle = 'FinFlo',
  showLogo = true,
  backToLanding = true,
}) => {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background relative overflow-hidden">
      {/* ─── Branding Side (Desktop Only) ─────────────────────── */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-slate-950">
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse animation-delay-2000" />
        </div>

        {/* Logo Section */}
        {showLogo && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              to="/"
              className="relative z-10 flex items-center hover:scale-[1.01] transition-transform"
            >
              <Logo showText={true} innerTextColor="white" />
            </Link>
          </motion.div>
        )}

        {/* Central Content */}
        <div className="relative z-10 space-y-8 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary-foreground text-[10px] font-black uppercase tracking-wider">
              <Sparkles size={12} className="text-primary" />
              {badge}
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-6xl font-black text-white leading-[1.1] tracking-tighter"
          >
            Join the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
              Financial
            </span>{' '}
            Revolution.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-slate-400 text-lg font-medium leading-relaxed"
          >
            Submit your onboarding details to link into the private business
            ledger. Wait for your administrator to approve your portal access
            and start managing your finances with precision.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10"
          >
            <div>
              <p className="text-white text-2xl font-black tracking-tight">
                100%
              </p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                Secure Protocol
              </p>
            </div>
            <div>
              <p className="text-white text-2xl font-black tracking-tight">
                E2E
              </p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                Encrypted Ledger
              </p>
            </div>
          </motion.div>
        </div>

        {/* Footer Info */}
        <div className="relative z-10">
          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em]">
            Precision Engineering for Modern Finance
          </p>
        </div>
      </div>

      {/* ─── Form Side ───────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center p-4 lg:p-20 relative bg-background min-h-screen overflow-y-auto overflow-x-hidden">
        {/* Decorative elements for the form side background */}
        <div className="absolute top-0 -left-10 w-72 lg:w-96 h-72 lg:h-96 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute bottom-0 -right-10 w-72 lg:w-96 h-72 lg:h-96 bg-emerald-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />

        <div className="w-full max-w-lg lg:max-w-md relative z-10 py-8 lg:py-0">
          <div className="glass lg:bg-transparent dark:glass-dark lg:dark:bg-transparent border lg:border-none border-border/50 shadow-2xl lg:shadow-none shadow-black/5 rounded-[2.5rem] p-8 lg:p-0 overflow-hidden lg:overflow-visible relative">
            {/* Top accent line - only on mobile */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent lg:hidden" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {showLogo && (
                <div className="lg:hidden mb-12 flex justify-center">
                  <Link
                    to="/"
                    className="inline-block hover:scale-[1.02] transition-transform active:scale-95"
                  >
                    <Logo showText={true} className="h-9" />
                  </Link>
                </div>
              )}
              <div className="space-y-3">
                <h2 className="text-3xl lg:text-4xl font-black tracking-tighter text-foreground leading-tight">
                  {title}
                </h2>
                {description && (
                  <p className="text-muted-foreground text-sm lg:text-base font-medium leading-relaxed opacity-80 lg:opacity-100">
                    {description}
                  </p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="mt-10"
            >
              {children}
            </motion.div>

            {backToLanding && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="pt-10 border-t border-border/50 mt-12"
              >
                <Link
                  to="/"
                  className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-all duration-300 group"
                >
                  <ArrowLeft
                    size={14}
                    className="group-hover:-translate-x-1 transition-transform"
                  />
                  Back to Corporate Landing
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
