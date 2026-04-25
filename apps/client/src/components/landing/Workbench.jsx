import { motion } from 'framer-motion';
import { CheckCircle2, TrendingUp, Database, Users } from 'lucide-react';

const workbenchItems = [
  {
    icon: TrendingUp,
    color: 'primary',
    title: 'Command Center',
    subtitle: 'Analytics V4',
    features: [
      'Real-time ROI computation across all loan tiers.',
      'Predictive default risk scoring using neural nodes.',
      'Dynamic treasury balancing for capital efficiency.',
    ],
    image:
      'https://res.cloudinary.com/dzfcf4sqf/image/upload/q_auto/f_auto/v1775537327/Group_6_ty3qhh.png',
    imageAlt: 'Command Center',
    reverse: false,
  },
  {
    icon: Database,
    color: 'emerald',
    title: 'Unified Ledger',
    subtitle: 'Indisputable History',
    features: [
      'Zero-latency transaction history tracking.',
      'Automated repayment scheduling and collection nodes.',
      'Smart contract logic for automated late fees.',
    ],
    image:
      'https://res.cloudinary.com/dzfcf4sqf/image/upload/q_auto/f_auto/v1775537326/Group_8_ykgy1d.png',
    imageAlt: 'Ledger Management',
    reverse: true,
  },
  {
    icon: Users,
    color: 'indigo',
    title: 'Self-Service Portal',
    subtitle: 'Member Autonomy',
    features: [
      'Sub-second loan request submission workflow.',
      'Real-time investment ROI tracking with dynamic charts.',
      'Direct notifications for status approval or rejection.',
    ],
    image:
      'https://res.cloudinary.com/dzfcf4sqf/image/upload/q_auto/f_auto/v1775537323/Group_5_smt8x2.png',
    imageAlt: 'Member Dashboard',
    reverse: false,
    overlay: {
      label: 'Live Feed',
      title: 'Investment Updated',
      badge: '+8.4% APR',
    },
  },
];

const colorMap = {
  primary: {
    bg: 'bg-primary',
    text: 'text-primary-foreground',
    check: 'bg-primary/10 text-primary',
    glow: 'bg-primary/20',
  },
  emerald: {
    bg: 'bg-emerald-500',
    text: 'text-white',
    check: 'bg-emerald-500/10 text-emerald-500',
    glow: 'bg-emerald-500/20',
  },
  indigo: {
    bg: 'bg-indigo-500',
    text: 'text-white',
    check: 'bg-indigo-500/10 text-indigo-500',
    glow: 'bg-indigo-500/20',
  },
};

const Workbench = () => {
  return (
    <section
      id="the-workbench"
      className="py-28 lg:py-36 bg-slate-950 text-white overflow-hidden relative"
    >
      {/* Background gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_70%)]" />
      
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-24 space-y-5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Digital Command Center
          </p>
          <h2 className="text-4xl lg:text-[3.5rem] font-extrabold tracking-[-0.035em] leading-[0.95]">
            A UI designed for{' '}
            <span className="text-gradient-primary">
              mastery
            </span>
          </h2>
          <p className="text-lg text-slate-400 font-normal leading-relaxed">
            Explore the actual environment your administrators will orchestrate.
          </p>
        </motion.div>

        <div className="space-y-28 lg:space-y-36">
          {workbenchItems.map((item, idx) => {
            const colors = colorMap[item.color];
            return (
              <div
                key={idx}
                className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
              >
                {/* Text side */}
                <motion.div
                  initial={{ opacity: 0, x: item.reverse ? 30 : -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className={`space-y-6 ${item.reverse ? 'order-1 lg:order-2' : ''}`}
                >
                  <div
                    className={`w-11 h-11 ${colors.bg} rounded-xl flex items-center justify-center shadow-lg`}
                  >
                    <item.icon size={20} className={colors.text} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-lg text-slate-500 font-normal">
                      {item.subtitle}
                    </p>
                  </div>
                  <ul className="space-y-3.5">
                    {item.features.map((feat, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-slate-400 font-normal leading-relaxed text-[15px]"
                      >
                        <div
                          className={`flex-shrink-0 w-5 h-5 rounded-full ${colors.check} flex items-center justify-center mt-0.5`}
                        >
                          <CheckCircle2 size={10} strokeWidth={3} />
                        </div>
                        {feat}
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Image side */}
                <motion.div
                  initial={{ opacity: 0, x: item.reverse ? -30 : 30, scale: 0.95 }}
                  whileInView={{ opacity: 1, x: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className={`relative group ${item.reverse ? 'order-2 lg:order-1' : ''}`}
                >
                  {/* Glow */}
                  <div
                    className={`absolute -inset-4 ${colors.glow} blur-[80px] opacity-30 group-hover:opacity-50 transition-opacity duration-700`}
                  />
                  <div className="relative rounded-2xl max-w-[500px]">
                    <img
                      src={item.image}
                      alt={item.imageAlt}
                      loading="lazy"
                      className="w-full transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    {/* Optional floating overlay */}
                    {item.overlay && (
                      <div className="absolute bottom-5 left-5 right-5 p-5 bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08] rounded-2xl translate-y-3 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-indigo-400">
                              {item.overlay.label}
                            </p>
                            <p className="font-semibold text-white text-sm">
                              {item.overlay.title}
                            </p>
                          </div>
                          <div className="px-3 py-1.5 bg-indigo-500 rounded-full text-[10px] font-semibold text-white">
                            {item.overlay.badge}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Workbench;
