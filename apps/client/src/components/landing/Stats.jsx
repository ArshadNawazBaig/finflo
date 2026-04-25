import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Zap, ShieldCheck, Building2 } from 'lucide-react';
import api from '@/lib/axios';

const Stats = () => {
  const [stats, setStats] = useState({
    activeBusinesses: '...',
    activeMembers: '...',
    globalBranches: '...',
    loanProcessing: '<2.4s',
    dataSecurity: 'Bank-Grade',
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/public/stats');
        setStats({
          activeBusinesses: data.data.activeBusinesses + '+',
          activeMembers: data.data.activeMembers + '+',
          globalBranches: data.data.globalBranches,
          loanProcessing: '<2.4s',
          dataSecurity: 'Bank-Grade',
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        // Fallback to defaults if API fails
        setStats({
          activeBusinesses: '12',
          activeMembers: '1.2M+',
          globalBranches: '850',
          loanProcessing: '<2.4s',
          dataSecurity: 'Bank-Grade',
        });
      }
    };

    fetchStats();
  }, []);

  const statItems = [
    {
      label: 'Active Businesses',
      value: stats.activeBusinesses,
      icon: <Building2 className="w-5 h-5" />,
      color: 'text-blue-500',
    },
    {
      label: 'Global Branches',
      value: stats.globalBranches,
      icon: <Globe className="w-5 h-5" />,
      color: 'text-indigo-500',
    },
    {
      label: 'Loan Processing',
      value: stats.loanProcessing,
      icon: <Zap className="w-5 h-5" />,
      color: 'text-amber-500',
    },
    {
      label: 'Data Security',
      value: stats.dataSecurity,
      icon: <ShieldCheck className="w-5 h-5" />,
      color: 'text-emerald-500',
    },
  ];

  return (
    <section className="py-20 bg-slate-50/50 dark:bg-white/[0.01] border-y border-slate-100 dark:border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
          {statItems.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="group text-center space-y-4"
            >
              <div className={`mx-auto w-11 h-11 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] shadow-sm flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform duration-500`}>
                {stat.icon}
              </div>
              <div className="space-y-1">
                <h4 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {stat.value}
                </h4>
                <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  {stat.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
