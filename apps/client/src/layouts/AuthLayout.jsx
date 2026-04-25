import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';
import { getLandingUrl, IS_DEV, IS_NATIVE } from '@/lib/constants';

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
          <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_60%)]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05),transparent_60%)]" />
        </div>

        {/* Logo Section */}
        {showLogo && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <a
              href={IS_DEV ? '/' : getLandingUrl('/')}
              className="relative z-10 flex items-center hover:scale-[1.01] transition-transform"
            >
              <Logo showText={true} innerTextColor="white" />
            </a>
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
            className="text-5xl lg:text-6xl font-extrabold text-white leading-[1.05] tracking-tight"
          >
            Join the{' '}
            <span className="text-gradient-primary">
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
            className="grid grid-cols-2 gap-8 pt-8 border-t border-white/[0.06]"
          >
            <div>
              <p className="text-white text-3xl font-extrabold tracking-tight">
                100%
              </p>
              <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-[0.15em] mt-1.5">
                Secure Protocol
              </p>
            </div>
            <div>
              <p className="text-white text-3xl font-extrabold tracking-tight">
                E2E
              </p>
              <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-[0.15em] mt-1.5">
                Encrypted Ledger
              </p>
            </div>
          </motion.div>
        </div>

        {/* Footer Info */}
        <div className="relative z-10">
          <p className="text-slate-500 text-[10px] font-medium uppercase tracking-[0.2em]">
            Precision Engineering for Modern Finance
          </p>
        </div>
      </div>

      {/* ─── Form Side ───────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-start lg:justify-center p-4 lg:p-10 pt-12 lg:pt-10 relative bg-background min-h-screen overflow-y-auto overflow-x-hidden">
        {/* Decorative elements — static on native to prevent WebView flickering */}
        {!IS_NATIVE && (
          <>
            <div className="absolute top-0 -left-10 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03),transparent_60%)] pointer-events-none" />
            <div className="absolute bottom-0 -right-10 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03),transparent_60%)] pointer-events-none" />
          </>
        )}

        <div className="w-full max-w-lg lg:max-w-md relative z-10 py-8 lg:py-0">
          <div className="bg-white/90 dark:bg-slate-950/90 lg:bg-transparent lg:dark:bg-transparent border lg:border-none border-slate-100 dark:border-white/[0.04] shadow-xl lg:shadow-none shadow-black/[0.02] rounded-3xl p-8 lg:p-0 overflow-hidden lg:overflow-visible relative">
            {/* Top accent line - only on mobile */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent lg:hidden" />

            <div className="space-y-6 animate-in fade-in duration-500">
              {showLogo && (
                <div className="lg:hidden mb-12 flex justify-center">
                  <a
                    href={IS_DEV ? '/' : getLandingUrl('/')}
                    className="inline-block hover:scale-[1.02] transition-transform active:scale-95"
                  >
                    <Logo showText={true} className="h-9" />
                  </a>
                </div>
              )}
              <div className="space-y-3 text-center">
                <h2 className="text-3xl lg:text-[2.5rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                  {title}
                </h2>
                {description && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm lg:text-[15px] font-normal leading-relaxed opacity-80 lg:opacity-100">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-10 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
              {children}
            </div>

            {backToLanding && !IS_NATIVE && (
              <div className="pt-10 border-t border-slate-100 dark:border-white/[0.04] mt-12 animate-in fade-in duration-500 delay-200">
                <a
                  href={IS_DEV ? '/' : getLandingUrl('/')}
                  className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-300 group"
                >
                  <ArrowLeft
                    size={15}
                    className="group-hover:-translate-x-1 transition-transform"
                  />
                  Back to Corporate Landing
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
