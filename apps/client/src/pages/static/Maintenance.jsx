import { motion } from 'framer-motion';
import { Hammer, RefreshCw, Clock, Settings, ArrowRight } from 'lucide-react';
import useSystemSettings from '@/hooks/useSystemSettings';
import SplashScreen from '@/components/ui/SplashScreen';

const Maintenance = () => {
  const { settings, loading } = useSystemSettings();

  if (loading) return <SplashScreen />;

  return (
    <div className="min-h-screen w-full bg-white dark:bg-slate-950 relative flex items-center justify-center overflow-hidden">
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.05] pointer-events-none text-slate-900 dark:text-white"
        style={{
          backgroundImage:
            'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Soft radial spotlight */}
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-primary/10 via-violet-500/5 to-transparent blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-2xl w-full px-6 text-center"
      >
        {/* Icon chip + eyebrow */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center [&_svg]:w-3.5 [&_svg]:h-3.5">
            <Hammer />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
            Scheduled maintenance
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] leading-tight text-slate-900 dark:text-white mb-5">
          We'll be right back.
        </h1>

        {/* Subhead */}
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed mb-10">
          We're fine-tuning the platform to bring you a faster, more reliable
          experience. Thanks for your patience.
        </p>

        {/* Status tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 text-left">
          {[
            {
              icon: Clock,
              label: 'Est. time',
              value: settings?.estimatedMaintenanceTime || '25 mins',
            },
            { icon: RefreshCw, label: 'Status', value: 'Updating' },
            { icon: Settings, label: 'Module', value: 'Core engine' },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  {label}
                </p>
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center [&_svg]:w-3.5 [&_svg]:h-3.5">
                  <Icon />
                </div>
              </div>
              <p className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={() => window.location.reload()}
            className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-7 py-3.5 rounded-full font-bold text-sm shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto"
          >
            <RefreshCw
              size={14}
              strokeWidth={2.5}
              className="group-hover:rotate-180 transition-transform duration-500"
            />
            Check status
            <span className="ml-1 w-6 h-6 rounded-full bg-white text-primary flex items-center justify-center">
              <ArrowRight size={12} strokeWidth={3} />
            </span>
          </button>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] px-5 py-3 rounded-full transition-all"
          >
            Go back
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Maintenance;
