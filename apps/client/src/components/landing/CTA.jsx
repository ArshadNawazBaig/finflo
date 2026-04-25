import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getAppUrl, IS_LANDING_DOMAIN, IS_DEV } from '@/lib/constants';
import useSystemSettings from '@/hooks/useSystemSettings';

const CTA = ({ onContactClick }) => {
  const { settings } = useSystemSettings();
  const supportEmail = settings?.supportEmail || 'support@finflo.org';

  return (
    <section className="pt-20 pb-10 lg:pt-28 lg:pb-16 px-6 relative z-10">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-slate-950 rounded-3xl p-12 lg:p-20 text-center text-white overflow-hidden"
        >
          {/* Background effects */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.12),transparent_70%)]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
            <div className="space-y-5">
              <h2 className="text-4xl lg:text-6xl font-extrabold tracking-[-0.035em] leading-[0.95]">
                Begin your{' '}
                <span className="text-gradient-primary">
                  financial evolution
                </span>
              </h2>
              <p className="text-lg text-slate-400 font-normal leading-relaxed max-w-lg mx-auto">
                Stop managing with spreadsheets. Deploy FinFlo today and
                transform your lending operations into an automated powerhouse.
              </p>
            </div>

            <div className="text-xs font-medium text-slate-500 tracking-wider">
              {supportEmail}
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              {(!IS_LANDING_DOMAIN || IS_DEV) && (
                <Link
                  to="/register"
                  className="group inline-flex items-center justify-center gap-2.5 bg-primary text-white px-8 py-4 rounded-xl font-medium text-sm shadow-[0_16px_40px_-8px_rgba(var(--primary),0.35)] hover:shadow-[0_20px_50px_-10px_rgba(var(--primary),0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                >
                  Get started free
                  <ArrowRight
                    size={15}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </Link>
              )}
              <button
                onClick={onContactClick}
                className="group inline-flex items-center justify-center gap-2.5 bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] text-white px-8 py-4 rounded-xl font-medium text-sm hover:bg-white/[0.1] hover:border-white/15 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              >
                Talk to sales
                <ArrowRight
                  size={15}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
