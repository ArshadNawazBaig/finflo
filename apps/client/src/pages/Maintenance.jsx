import { motion } from 'framer-motion';
import { Hammer, Settings, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useSystemSettings from '@/hooks/useSystemSettings';
import SplashScreen from '@/components/ui/SplashScreen';

const Maintenance = () => {
  const { settings, loading } = useSystemSettings();

  if (loading) return <SplashScreen />;

  return (
    <div className="min-h-screen w-full bg-[#020617] relative flex items-center justify-center overflow-hidden font-sans">
      {/* ... rest of the component remains the same ... */}
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-700" />

        {/* Animated Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-2xl w-full px-6 text-center"
      >
        {/* Animated Icon Group */}
        <div className="relative mb-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-dashed border-primary/20 rounded-full"
          />
          <div className="relative w-24 h-24 bg-gradient-to-tr from-primary to-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-primary/20 transform -rotate-12 group">
            <Settings className="text-white w-12 h-12 animate-spin-slow" />
            <motion.div
              animate={{
                y: [0, -5, 0],
                rotate: [0, 5, 0],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-4 -right-4 w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl shadow-black/20 transform rotate-12"
            >
              <Hammer className="text-primary w-6 h-6" />
            </motion.div>
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-6">
          <motion.h1
            initial={{ opacity: 0, s: 0.9 }}
            animate={{ opacity: 1, s: 1 }}
            className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight"
          >
            System <span className="text-primary italic">Enhancement</span>{' '}
            <br />
            Underway
          </motion.h1>

          <p className="text-slate-400 text-lg md:text-xl font-medium max-w-lg mx-auto leading-relaxed">
            We're currently fine-tuning our infrastructure to bring you a more
            powerful lending experience. We'll be back momentarily.
          </p>

          {/* Status Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-8">
            {[
              {
                icon: <Clock size={16} />,
                label: 'Est. Time',
                value: settings?.estimatedMaintenanceTime || '25 mins',
              },
              {
                icon: <RefreshCw size={16} />,
                label: 'Live Status',
                value: 'Updating',
              },
              {
                icon: <Settings size={16} />,
                label: 'Module',
                value: 'Core Engine',
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="bg-white/5 dark:bg-white/5 border border-white/10 backdrop-blur-md p-4 rounded-2xl"
              >
                <div className="flex items-center gap-2 text-primary mb-1 justify-center md:justify-start">
                  {stat.icon}
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {stat.label}
                  </span>
                </div>
                <div className="text-white font-bold text-sm tracking-tight">
                  {stat.value}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => window.location.reload()}
              className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 group transition-all"
            >
              <RefreshCw className="mr-2 w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              Check Status
            </Button>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="h-14 px-10 rounded-2xl border-white/10 bg-white/5 text-primary-foreground font-black uppercase tracking-widest text-[11px] backdrop-blur-md"
            >
              Go Back
            </Button>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="mt-20 flex items-center justify-center gap-3 opacity-30">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <span className="text-white font-black text-xs">L</span>
          </div>
          <span className="text-white font-bold text-xs uppercase tracking-[0.3em]">
            LoanEngine Platform
          </span>
        </div>
      </motion.div>

      {/* CSS for custom animations if needed */}
      <style jsx="true">{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Maintenance;
