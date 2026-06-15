import { useState, useEffect } from 'react';
import {
  Brain,
  AlertTriangle,
  TrendingDown,
  UserX,
  CreditCard,
  Activity,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const INSIGHT_ICONS = {
  saving_rate_drop: TrendingDown,
  loan_default_risk: AlertTriangle,
  inactive_members: UserX,
  credit_utilization: CreditCard,
  unusual_volume: Activity,
};

const SEVERITY_STYLES = {
  critical: {
    chip: 'bg-rose-500/10 text-rose-500 dark:text-rose-400',
    badge: 'bg-rose-500/10 text-rose-500 dark:text-rose-400',
    accent: 'text-rose-500 dark:text-rose-400',
  },
  warning: {
    chip: 'bg-amber-500/10 text-amber-500 dark:text-amber-400',
    badge: 'bg-amber-500/10 text-amber-500 dark:text-amber-400',
    accent: 'text-amber-500 dark:text-amber-400',
  },
  info: {
    chip: 'bg-primary/10 text-primary',
    badge: 'bg-primary/10 text-primary',
    accent: 'text-primary',
  },
};

const InsightsWidget = ({ className }) => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await api.get('/insights');
      setInsights(data || []);
    } catch {
      setInsights([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const displayInsights = expanded ? insights : insights.slice(0, 5);
  const criticalCount = insights.filter(
    (i) => i.severity === 'critical',
  ).length;
  const warningCount = insights.filter((i) => i.severity === 'warning').length;

  return (
    <div
      className={cn(
        'rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <div className="p-5 sm:p-6 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <Brain />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-0.5 flex items-center gap-1.5">
              AI insights
              <Sparkles size={10} className="text-primary" />
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {criticalCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 dark:text-rose-400">
                  {criticalCount} critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 dark:text-amber-400">
                  {warningCount} warning
                </span>
              )}
              {insights.length === 0 && !loading && (
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  All clear
                </span>
              )}
              {(criticalCount > 0 || warningCount > 0) && (
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  to review
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          className="h-8 w-8 rounded-full bg-slate-50 dark:bg-white/[0.04] text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] flex items-center justify-center transition-all shrink-0"
          aria-label="Refresh insights"
        >
          <RefreshCw size={13} className={cn(refreshing && 'animate-spin')} />
        </Button>
      </div>

      {/* Insights list */}
      <div className="p-3 sm:p-4 space-y-2 max-h-[440px] overflow-y-auto">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex gap-3 p-4 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] animate-pulse"
            >
              <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-3/4" />
                <div className="h-2.5 bg-slate-100 dark:bg-white/5 rounded w-full" />
                <div className="h-2.5 bg-slate-100 dark:bg-white/5 rounded w-2/3" />
              </div>
            </div>
          ))
        ) : insights.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4 [&_svg]:w-5 [&_svg]:h-5">
              <Sparkles />
            </div>
            <p className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              Looking good
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              No anomalies or insights detected right now.
            </p>
          </div>
        ) : (
          displayInsights.map((insight, idx) => {
            const style =
              SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info;
            const Icon = INSIGHT_ICONS[insight.type] || Activity;

            return (
              <div
                key={idx}
                className="flex gap-3 p-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:bg-slate-50/40 dark:hover:bg-white/[0.04] transition-colors"
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5',
                    style.chip,
                  )}
                >
                  <Icon />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-extrabold tracking-[-0.015em] leading-tight text-slate-900 dark:text-white">
                      {insight.title}
                    </p>
                    {insight.metric && (
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 whitespace-nowrap tabular-nums',
                          style.badge,
                        )}
                      >
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1.5">
                    {insight.description}
                  </p>
                  {insight.recommendation && (
                    <div className="mt-2.5 flex items-start gap-1.5">
                      <Sparkles
                        size={10}
                        className={cn('mt-0.5 shrink-0', style.accent)}
                      />
                      <p
                        className={cn(
                          'text-[11px] font-semibold leading-relaxed',
                          style.accent,
                        )}
                      >
                        {insight.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {insights.length > 5 && (
        <div className="px-5 sm:px-6 pb-5 pt-1">
          <Button
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            {expanded ? 'Show less' : `View all ${insights.length} insights`}
            <ArrowRight
              size={12}
              className={cn(
                'transition-transform',
                expanded ? 'rotate-90' : 'group-hover:translate-x-0.5',
              )}
            />
          </Button>
        </div>
      )}
    </div>
  );
};

export default InsightsWidget;
