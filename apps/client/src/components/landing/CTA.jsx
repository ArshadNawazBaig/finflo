import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getAppUrl, IS_LANDING_DOMAIN, IS_DEV } from '@/lib/constants';
import useSystemSettings from '@/hooks/useSystemSettings';

const CTA = ({ onContactClick }) => {
  const { settings } = useSystemSettings();
  const supportEmail = settings?.supportEmail || 'support@finflo.org';
  return (
    <section className="py-24 px-6 relative z-10 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative bg-slate-950 rounded-[4rem] p-12 lg:p-24 text-center text-white overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.2),transparent)]" />
          <div className="relative z-10 space-y-8">
            <h2 className="text-5xl lg:text-[6rem] font-black tracking-tighter leading-none">
              Begin your <br />{' '}
              <span className="text-primary italic">Financial Evolution.</span>
            </h2>
            <p className="text-lg text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
              Stop managing with spreadsheets. Deploy FinFlo today and transform
              your lending operations into an automated powerhouse.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              {(!IS_LANDING_DOMAIN || IS_DEV) && (
                <Link
                  to="/register"
                  className="bg-primary text-primary-foreground px-10 py-5 rounded-full font-black uppercase tracking-widest text-xs shadow-[0_0_50px_rgba(99,102,241,0.4)] hover:shadow-[0_0_80px_rgba(99,102,241,0.6)] hover:scale-105 transition-all active:scale-95"
                >
                  Initiate System Now
                </Link>
              )}
              <button
                onClick={onContactClick}
                className="inline-block bg-white/5 backdrop-blur-xl border border-white/10 px-10 py-5 rounded-full font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all active:scale-95 shadow-xl text-center"
              >
                Talk to Infrastructure
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
