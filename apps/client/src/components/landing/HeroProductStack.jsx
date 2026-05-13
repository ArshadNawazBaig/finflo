import { motion } from 'framer-motion';
import {
  Wallet,
  Banknote,
  TrendingUp,
  Users,
  Activity,
  PieChart,
  ArrowUpRight,
  Settings,
} from 'lucide-react';

const HeroDashboardMock = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.4, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-5xl mx-auto"
    >
      {/* Soft ground shadow */}
      <div className="absolute -bottom-6 left-8 right-8 h-12 bg-black/30 blur-2xl rounded-full" />

      <div className="relative rounded-t-[1.5rem] sm:rounded-t-[2rem] bg-white overflow-hidden shadow-[0_40px_80px_-20px_rgba(15,23,42,0.45)] border border-white/60">
        {/* Top window bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-slate-100 text-[10px] font-medium text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              app.finflo.org / dashboard
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Settings size={12} className="text-slate-400" />
            <div className="w-6 h-6 rounded-full bg-primary/20" />
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="hidden sm:flex flex-col w-[170px] bg-slate-50/50 border-r border-slate-100 py-5 px-3 gap-1">
            <p className="px-3 mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Workspace
            </p>
            {[
              { icon: Wallet, label: 'Wallet', active: true },
              { icon: Banknote, label: 'Loans' },
              { icon: Users, label: 'Members' },
              { icon: PieChart, label: 'Reports' },
              { icon: Activity, label: 'Activity' },
            ].map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-semibold ${
                  active
                    ? 'bg-white shadow-sm text-primary border border-slate-100'
                    : 'text-slate-500'
                }`}
              >
                <Icon size={13} strokeWidth={2.5} />
                {label}
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="flex-1 p-5 sm:p-6 min-w-0">
            {/* Heading */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-0.5">
                  Overview
                </p>
                <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
                  Good morning, Sarah
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-slate-500">
                  Live
                </span>
              </div>
            </div>

            {/* 3 stat cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
              {[
                { label: 'Available', value: 'Rs 5,567', icon: Wallet, tone: 'primary' },
                { label: 'Loans active', value: 'Rs 8,535', icon: Banknote, tone: 'emerald' },
                { label: 'Investments', value: 'Rs 2,324', icon: TrendingUp, tone: 'amber' },
              ].map((s) => {
                const Icon = s.icon;
                const tones = {
                  primary: 'bg-primary/10 text-primary',
                  emerald: 'bg-emerald-500/10 text-emerald-500',
                  amber: 'bg-amber-500/10 text-amber-500',
                };
                return (
                  <div
                    key={s.label}
                    className="min-w-0 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/40"
                  >
                    <div className="flex items-center justify-between gap-1 mb-2 sm:mb-2.5">
                      <p className="min-w-0 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.12em] text-slate-400 truncate">
                        {s.label}
                      </p>
                      <div className={`shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg flex items-center justify-center ${tones[s.tone]}`}>
                        <Icon size={11} strokeWidth={2.5} />
                      </div>
                    </div>
                    <p className="text-[12px] sm:text-lg font-extrabold tracking-tight text-slate-900 tabular-nums truncate">
                      {s.value}
                    </p>
                    <div className="flex items-center gap-1 mt-1 min-w-0">
                      <ArrowUpRight size={9} className="text-emerald-500 shrink-0" strokeWidth={3} />
                      <span className="text-[9px] font-bold text-emerald-600">+12%</span>
                      <span className="hidden sm:inline text-[9px] font-medium text-slate-400 truncate">vs last week</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom row — big balance + mini chart */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl border border-slate-100 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-1">
                      Total portfolio value
                    </p>
                    <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                      Rs 14,235
                      <span className="text-xs text-slate-400 font-bold">.00</span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {['1D', '1W', '1M', '1Y'].map((p, i) => (
                      <span
                        key={p}
                        className={`text-[9px] font-bold px-2 py-1 rounded-md ${
                          i === 2
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-400'
                        }`}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                {/* mini chart */}
                <div className="h-14 flex items-end gap-1">
                  {[35, 48, 42, 60, 55, 72, 68, 84, 78, 92, 88, 100, 95, 110, 102, 118].map(
                    (h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h * 0.55}%` }}
                        transition={{
                          delay: 1.1 + i * 0.03,
                          duration: 0.5,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/20 to-primary"
                      />
                    ),
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl border border-slate-100 bg-white">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-3">
                  Latest activity
                </p>
                <div className="space-y-2.5">
                  {[
                    { label: 'Loan funded', amt: '+Rs 24,500', tone: 'emerald' },
                    { label: 'Payment received', amt: '+Rs 1,250', tone: 'emerald' },
                    { label: 'Transfer sent', amt: '−Rs 420', tone: 'rose' },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            r.tone === 'emerald' ? 'bg-emerald-500' : 'bg-rose-400'
                          }`}
                        />
                        <span className="text-[11px] font-semibold text-slate-700">
                          {r.label}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-extrabold tabular-nums ${
                          r.tone === 'emerald' ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {r.amt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default HeroDashboardMock;
