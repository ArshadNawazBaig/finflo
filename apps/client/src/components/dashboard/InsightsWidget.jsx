import { useState, useEffect } from 'react';
import {
  Brain,
  AlertTriangle,
  TrendingDown,
  UserX,
  CreditCard,
  Activity,
  ChevronRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

const INSIGHT_ICONS = {
  saving_rate_drop: TrendingDown,
  loan_default_risk: AlertTriangle,
  inactive_members: UserX,
  credit_utilization: CreditCard,
  unusual_volume: Activity,
};

const SEVERITY_STYLES = {
  critical: {
    border: 'border-red-500/20',
    bg: 'bg-red-500/5',
    badge: 'bg-red-500/10 text-red-600',
    dot: 'bg-red-500',
    iconBg: 'bg-red-500/10 text-red-500',
  },
  warning: {
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
    badge: 'bg-amber-500/10 text-amber-600',
    dot: 'bg-amber-500',
    iconBg: 'bg-amber-500/10 text-amber-500',
  },
  info: {
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/5',
    badge: 'bg-blue-500/10 text-blue-600',
    dot: 'bg-blue-500',
    iconBg: 'bg-blue-500/10 text-blue-500',
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

  useEffect(() => { fetchInsights(); }, []);

  const displayInsights = expanded ? insights : insights.slice(0, 5);
  const criticalCount = insights.filter((i) => i.severity === 'critical').length;
  const warningCount = insights.filter((i) => i.severity === 'warning').length;

  return (
    <div className={cn('bg-card rounded-[2rem] border border-border/50 overflow-hidden', className)}>
      {/* Header */}
      <div className="p-5 pb-4 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 text-violet-500 shadow-inner">
            <Brain size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-tight">AI Insights</h3>
              <Sparkles size={12} className="text-violet-400" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {criticalCount > 0 && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600">
                  {criticalCount} critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                  {warningCount} warning
                </span>
              )}
              {insights.length === 0 && !loading && (
                <span className="text-[9px] font-bold text-muted-foreground">All clear!</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
        >
          <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Insights list */}
      <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted/20 animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-muted/40 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted/40 rounded w-3/4" />
                <div className="h-2 bg-muted/30 rounded w-full" />
              </div>
            </div>
          ))
        ) : insights.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-3">
              <Sparkles size={20} />
            </div>
            <p className="text-xs font-black text-foreground">Looking Good!</p>
            <p className="text-[10px] text-muted-foreground mt-1">No anomalies or insights detected.</p>
          </div>
        ) : (
          displayInsights.map((insight, idx) => {
            const style = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info;
            const Icon = INSIGHT_ICONS[insight.type] || Activity;

            return (
              <div
                key={idx}
                className={cn(
                  'flex gap-3 p-3 rounded-xl border transition-all hover:shadow-sm',
                  style.border,
                  style.bg,
                )}
              >
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', style.iconBg)}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-black leading-tight">{insight.title}</p>
                    {insight.metric && (
                      <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap', style.badge)}>
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-1 line-clamp-2">
                    {insight.description}
                  </p>
                  {insight.recommendation && (
                    <p className="text-[9px] font-bold text-violet-500/80 mt-1.5 flex items-center gap-1">
                      <Sparkles size={8} />
                      {insight.recommendation}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {insights.length > 5 && (
        <div className="p-3 pt-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-[10px] font-black uppercase tracking-widest text-violet-500/70 hover:text-violet-500 py-2 flex items-center justify-center gap-1 transition-colors"
          >
            {expanded ? 'Show Less' : `View All ${insights.length} Insights`}
            <ChevronRight size={10} className={cn('transition-transform', expanded && 'rotate-90')} />
          </button>
        </div>
      )}
    </div>
  );
};

export default InsightsWidget;
