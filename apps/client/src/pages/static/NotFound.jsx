import { motion } from 'framer-motion';
import { Home, ArrowLeft, ArrowRight, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center px-6 relative overflow-hidden">
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
        className="relative z-10 w-full max-w-2xl mx-auto text-center"
      >
        {/* Icon chip + eyebrow */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center [&_svg]:w-3.5 [&_svg]:h-3.5">
            <Compass />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
            404 · Page not found
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] leading-tight text-slate-900 dark:text-white mb-5">
          Looks like you're lost.
        </h1>

        {/* Subhead */}
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed mb-10">
          The page you were looking for doesn't exist or has been moved. Let's
          get you back on track.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={() => navigate('/')}
            className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-7 py-3.5 rounded-full font-bold text-sm shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto"
          >
            <Home size={14} strokeWidth={2.5} />
            Return home
            <span className="ml-1 w-6 h-6 rounded-full bg-white text-primary flex items-center justify-center">
              <ArrowRight size={12} strokeWidth={3} />
            </span>
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] px-5 py-3 rounded-full transition-all"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            Go back
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
