import { motion } from 'framer-motion';
import { CheckCircle2, TrendingUp, Database, Users } from 'lucide-react';

const Workbench = () => {
  return (
    <section
      id="the-workbench"
      className="py-24 bg-slate-950 text-white overflow-hidden relative"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent)]" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-24 space-y-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">
            Digital Command Center
          </h2>
          <h3 className="text-4xl lg:text-6xl font-black tracking-tighter leading-none">
            A UI designed for <br />{' '}
            <span className="italic text-primary">Mastery.</span>
          </h3>
          <p className="text-lg text-slate-400 font-medium">
            Don't take our word for it. Explore the actual environment your
            administrators will orchestrate.
          </p>
        </div>

        <div className="space-y-32">
          {/* Workbench Item 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-2xl">
                <TrendingUp size={24} className="text-primary-foreground" />
              </div>
              <h4 className="text-3xl font-black tracking-tighter">
                Command Center <br />{' '}
                <span className="text-slate-500">Analytics V4</span>
              </h4>
              <ul className="space-y-4">
                {[
                  'Real-time ROI computation across all loan tiers.',
                  'Predictive default risk scoring using neural nodes.',
                  'Dynamic treasury balancing for capital efficiency.',
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-4 text-slate-400 font-medium leading-relaxed text-sm"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary mt-0.5">
                      <CheckCircle2 size={10} strokeWidth={4} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="absolute -inset-4 bg-primary/30 blur-[100px] opacity-50 group-hover:opacity-80 transition-opacity" />
              <div className="relative rounded-[2.5rem] max-w-[500px]">
                <img
                  src="https://res.cloudinary.com/dzfcf4sqf/image/upload/v1770839093/d1_fjtwjp.png"
                  alt="Command Center"
                  loading="lazy"
                  className="w-full transition-transform duration-1000 group-hover:scale-105"
                />
              </div>
            </motion.div>
          </div>

          {/* Workbench Item 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true }}
              className="relative group order-2 lg:order-1"
            >
              <div className="absolute -inset-4 bg-emerald-500/30 blur-[100px] opacity-50 group-hover:opacity-80 transition-opacity" />
              <div className="relative rounded-[2.5rem] max-w-[500px]">
                <img
                  src="https://res.cloudinary.com/dzfcf4sqf/image/upload/v1770839093/d2_xflumw.png"
                  alt="Ledger Management"
                  loading="lazy"
                  className="w-full transition-transform duration-1000 group-hover:scale-105"
                />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6 order-1 lg:order-2"
            >
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl">
                <Database size={24} />
              </div>
              <h4 className="text-3xl font-black tracking-tighter">
                Unified Ledger <br />{' '}
                <span className="text-slate-500">Indisputable History</span>
              </h4>
              <ul className="space-y-4">
                {[
                  'Zero-latency transaction history tracking.',
                  'Automated repayment scheduling and collection nodes.',
                  'Smart contract logic for automated late fees.',
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-4 text-slate-400 font-medium leading-relaxed text-sm"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 mt-0.5">
                      <CheckCircle2 size={10} strokeWidth={4} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Workbench Item 3: Member Portal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-2xl">
                <Users size={24} />
              </div>
              <h4 className="text-3xl font-black tracking-tighter">
                Self-Service Portal <br />{' '}
                <span className="text-slate-500">Member Autonomy</span>
              </h4>
              <ul className="space-y-4">
                {[
                  'Sub-second loan request submission workflow.',
                  'Real-time investment ROI tracking with dynamic charts.',
                  'Direct notifications for status approval or rejection.',
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-4 text-slate-400 font-medium leading-relaxed text-sm"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-500 mt-0.5">
                      <CheckCircle2 size={10} strokeWidth={4} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="absolute -inset-4 bg-indigo-500/30 blur-[100px] opacity-50 group-hover:opacity-80 transition-opacity" />
              <div className="relative rounded-[2.5rem] max-w-[500px] shadow-3xl">
                <img
                  src="https://res.cloudinary.com/dzfcf4sqf/image/upload/v1770839093/d2_xflumw.png"
                  alt="Member Dashboard"
                  loading="lazy"
                  className="w-full transition-transform duration-1000 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                />
                <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                        Live Feed
                      </p>
                      <p className="font-bold text-white">Investment Updated</p>
                    </div>
                    <div className="px-3 py-1 bg-indigo-500 rounded-full text-[10px] font-black uppercase tracking-widest text-white">
                      +8.4% APR
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Workbench;
