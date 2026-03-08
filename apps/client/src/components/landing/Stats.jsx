import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Zap, ShieldCheck, Building2 } from 'lucide-react';
import api from '@/lib/axios';

const Stats = () => {
  const [stats, setStats] = useState({
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
          activeMembers: data.data.activeMembers + '+',
          globalBranches: data.data.globalBranches,
          loanProcessing: '<2.4s',
          dataSecurity: 'Bank-Grade',
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        // Fallback to defaults if API fails
        setStats({
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
      value: stats.activeMembers,
      icon: <Building2 className="w-5 h-5 text-blue-500" />,
    },
    {
      label: 'Global Branches',
      value: stats.globalBranches,
      icon: <Globe className="w-5 h-5 text-indigo-500" />,
    },
    {
      label: 'Loan Processing',
      value: stats.loanProcessing,
      icon: <Zap className="w-5 h-5 text-amber-500" />,
    },
    {
      label: 'Data Security',
      value: stats.dataSecurity,
      icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
    },
  ];

  return (
    <section className="py-20 bg-slate-50 dark:bg-slate-900/10 border-y border-slate-200 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {statItems.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="group text-center space-y-3"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-white dark:bg-white/5 shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                {stat.icon}
              </div>
              <div>
                <h4 className="text-3xl font-black tracking-tighter dark:text-white">
                  {stat.value}
                </h4>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
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
