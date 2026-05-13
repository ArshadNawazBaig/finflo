import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, AlertTriangle, FileWarning, DollarSign,
  Settings2, Eye, CheckCircle2, XCircle, Clock, TrendingUp,
  Plus, Trash2, ToggleLeft, ToggleRight, ChevronRight, RefreshCw,
} from 'lucide-react';
import api from '@/lib/axios';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { RegistryPageSkeleton } from '@/components/ui/PageSkeletons';
import StatsCard from '@/components/StatsCard';

const SEVERITY_COLORS = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/30',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

const STATUS_COLORS = {
  new: 'bg-red-500/10 text-red-400 border-red-500/30',
  under_review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  escalated: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  false_positive: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'rules', label: 'Rules', icon: Settings2 },
  { id: 'sar', label: 'SAR Reports', icon: FileWarning },
  { id: 'ctr', label: 'CTR Reports', icon: DollarSign },
];

const AmlCompliance = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [rules, setRules] = useState([]);
  const [sars, setSars] = useState([]);
  const [ctrs, setCtrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await api.get('/aml/dashboard');
      setDashboard(data);
    } catch (err) {
      console.error('Dashboard error:', err);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await api.get('/aml/alerts?limit=50');
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Alerts error:', err);
    }
  }, []);

  const fetchRules = useCallback(async () => {
    try {
      const { data } = await api.get('/aml/rules');
      setRules(data || []);
    } catch (err) {
      console.error('Rules error:', err);
    }
  }, []);

  const fetchSARs = useCallback(async () => {
    try {
      const { data } = await api.get('/aml/sar?limit=50');
      setSars(data.reports || []);
    } catch (err) {
      console.error('SAR error:', err);
    }
  }, []);

  const fetchCTRs = useCallback(async () => {
    try {
      const { data } = await api.get('/aml/ctr?limit=50');
      setCtrs(data.reports || []);
    } catch (err) {
      console.error('CTR error:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchDashboard(), fetchAlerts(), fetchRules(), fetchSARs(), fetchCTRs()]);
      setLoading(false);
    };
    load();
  }, [fetchDashboard, fetchAlerts, fetchRules, fetchSARs, fetchCTRs]);

  const seedDefaultRules = async () => {
    try {
      await api.post('/aml/rules/seed');
      toast.success('Default AML rules created');
      fetchRules();
      fetchDashboard();
    } catch (err) {
      toast.error('Failed to seed rules');
    }
  };

  const toggleRule = async (ruleId, isActive) => {
    try {
      await api.put(`/aml/rules/${ruleId}`, { isActive: !isActive });
      toast.success(`Rule ${!isActive ? 'activated' : 'deactivated'}`);
      fetchRules();
    } catch (err) {
      toast.error('Failed to update rule');
    }
  };

  const deleteRule = async (ruleId) => {
    try {
      await api.delete(`/aml/rules/${ruleId}`);
      toast.success('Rule deleted');
      fetchRules();
    } catch (err) {
      toast.error('Failed to delete rule');
    }
  };

  const updateAlertStatus = async (alertId, status) => {
    try {
      await api.put(`/aml/alerts/${alertId}/review`, { status, note: reviewNote || `Status changed to ${status}` });
      toast.success(`Alert ${status.replace('_', ' ')}`);
      setSelectedAlert(null);
      setReviewNote('');
      fetchAlerts();
      fetchDashboard();
    } catch (err) {
      toast.error('Failed to update alert');
    }
  };

  if (loading) {
    return <RegistryPageSkeleton />;
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="AML Compliance"
        description="Anti-Money Laundering monitoring, alerts, and regulatory reporting center."
        icon={ShieldAlert}
        variant="card"
        badge={
          dashboard && (
            <div className={cn(
              'px-5 h-12 flex items-center justify-center rounded-2xl border text-center min-w-[160px]',
              dashboard.complianceScore >= 80 ? 'bg-emerald-500/10 border-emerald-500/30' :
              dashboard.complianceScore >= 50 ? 'bg-yellow-500/10 border-yellow-500/30' :
              'bg-red-500/10 border-red-500/30'
            )}>
              <p className="text-sm font-black font-mono flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full',
                  dashboard.complianceScore >= 80 ? 'bg-emerald-500' :
                  dashboard.complianceScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                )} />
                SCORE: {dashboard.complianceScore}/100
              </p>
            </div>
          )
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                : 'bg-white dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-500'
            )}>
            <tab.icon size={14} />
            {tab.label}
            {tab.id === 'alerts' && dashboard?.openAlerts > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-black">{dashboard.openAlerts}</span>
            )}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Open Alerts', value: dashboard.openAlerts, color: 'bg-red-500 shadow-red-500/20', icon: <AlertTriangle size={20} /> },
              { label: 'Under Review', value: dashboard.underReview, color: 'bg-yellow-500 shadow-yellow-500/20', icon: <Clock size={20} /> },
              { label: 'Pending SARs', value: dashboard.pendingSARs, color: 'bg-orange-500 shadow-orange-500/20', icon: <FileWarning size={20} /> },
              { label: 'Pending CTRs', value: dashboard.pendingCTRs, color: 'bg-blue-500 shadow-blue-500/20', icon: <DollarSign size={20} /> },
            ].map((stat) => (
              <StatsCard
                key={stat.label}
                title={stat.label}
                amount={stat.value}
                icon={stat.icon}
                color={stat.color}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-4">Alerts by Severity</h3>
              <div className="space-y-3">
                {['critical', 'high', 'medium', 'low'].map((sev) => (
                  <div key={sev} className="flex items-center justify-between">
                    <span className={cn('px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border', SEVERITY_COLORS[sev])}>{sev}</span>
                    <span className="text-sm font-black font-mono">{dashboard.severity?.[sev] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-4">Recent Alerts</h3>
              {dashboard.recentAlerts?.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.recentAlerts.map((alert) => (
                    <div key={alert._id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn('px-2 py-0.5 rounded text-[8px] font-black uppercase border shrink-0', SEVERITY_COLORS[alert.severity])}>{alert.severity}</span>
                        <span className="text-xs font-bold truncate">{alert.title}</span>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/60 text-center py-8">No recent alerts</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
          {alerts.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No AML Alerts" description="No suspicious activity detected. All monitoring rules are running." className="py-20" />
          ) : (
            <div className="divide-y divide-border/30">
              {alerts.map((alert) => (
                <div key={alert._id} onClick={() => setSelectedAlert(alert)}
                  className="p-6 hover:bg-muted/20 transition-all cursor-pointer flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className={cn('px-2 py-1 rounded-lg text-[9px] font-black uppercase border shrink-0', SEVERITY_COLORS[alert.severity])}>{alert.severity}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground/60 truncate">{alert.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={cn('px-2 py-1 rounded-lg text-[8px] font-black uppercase border', STATUS_COLORS[alert.status])}>{alert.status.replace('_', ' ')}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/40">{new Date(alert.createdAt).toLocaleDateString()}</span>
                    <Eye size={14} className="text-muted-foreground/40" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {rules.length === 0 && (
            <div className="text-center py-12">
              <EmptyState icon={Settings2} title="No AML Rules Configured" description="Set up monitoring rules to detect suspicious transactions." className="py-8" />
              <button onClick={seedDefaultRules}
                className="mt-4 px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 mx-auto">
                <Plus size={14} /> Seed Default Rules
              </button>
            </div>
          )}
          {rules.map((rule) => (
            <div key={rule._id} className="p-4 sm:p-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4 min-w-0">
                <button onClick={() => toggleRule(rule._id, rule.isActive)} className="shrink-0 mt-1 sm:mt-0">
                  {rule.isActive ? <ToggleRight size={24} className="text-emerald-400" /> : <ToggleLeft size={24} className="text-muted-foreground/40" />}
                </button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className={cn('text-sm font-black', !rule.isActive && 'text-muted-foreground/40')}>{rule.name}</p>
                    <span className={cn('px-2 py-0.5 rounded text-[8px] font-black uppercase border', SEVERITY_COLORS[rule.severity])}>{rule.severity}</span>
                  </div>
                  <p className="text-xs text-muted-foreground/60">{rule.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-3 sm:pt-0 border-t border-slate-100 dark:border-white/[0.06] sm:border-0 mt-2 sm:mt-0">
                <span className="text-[10px] font-mono text-muted-foreground/40">Triggered: {rule.totalTriggered}</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-lg bg-muted/30 text-[9px] font-black uppercase tracking-wider text-muted-foreground">{rule.type}</span>
                  <button onClick={() => deleteRule(rule._id)} className="p-2 rounded-xl hover:bg-red-500/10 text-muted-foreground/40 hover:text-red-400 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SAR Tab */}
      {activeTab === 'sar' && (
        <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
          {sars.length === 0 ? (
            <EmptyState icon={FileWarning} title="No SAR Reports" description="Suspicious Activity Reports will appear here when generated from escalated alerts." className="py-20" />
          ) : (
            <div className="divide-y divide-border/30">
              {sars.map((sar) => (
                <div key={sar._id} className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black font-mono">{sar.reportNumber}</p>
                    <p className="text-xs text-muted-foreground/60">{sar.subjectName} • {sar.activityType}</p>
                  </div>
                  <span className={cn('px-3 py-1 rounded-lg text-[9px] font-black uppercase border',
                    sar.filingStatus === 'submitted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                    sar.filingStatus === 'draft' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                    'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  )}>{sar.filingStatus}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTR Tab */}
      {activeTab === 'ctr' && (
        <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
          {ctrs.length === 0 ? (
            <EmptyState icon={DollarSign} title="No CTR Reports" description="Currency Transaction Reports are auto-generated for cash transactions exceeding PKR 2,000,000." className="py-20" />
          ) : (
            <div className="divide-y divide-border/30">
              {ctrs.map((ctr) => (
                <div key={ctr._id} className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black font-mono">{ctr.reportNumber}</p>
                    <p className="text-xs text-muted-foreground/60">{ctr.subjectName} • {ctr.amount?.toLocaleString()} PKR</p>
                  </div>
                  <span className={cn('px-3 py-1 rounded-lg text-[9px] font-black uppercase border',
                    ctr.filingStatus === 'submitted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                  )}>{ctr.filingStatus?.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alert Review Modal */}
      <Dialog open={!!selectedAlert} onOpenChange={() => { setSelectedAlert(null); setReviewNote(''); }}>
        <DialogContent className="max-w-lg rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">{selectedAlert?.title}</DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <span className={cn('px-2 py-1 rounded-lg text-[9px] font-black uppercase border', SEVERITY_COLORS[selectedAlert.severity])}>{selectedAlert.severity}</span>
                <span className={cn('px-2 py-1 rounded-lg text-[9px] font-black uppercase border', STATUS_COLORS[selectedAlert.status])}>{selectedAlert.status.replace('_', ' ')}</span>
              </div>
              <p className="text-sm text-muted-foreground">{selectedAlert.description}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/40 mb-1">Total Amount</p>
                  <p className="text-sm font-black font-mono">{selectedAlert.totalAmount?.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/40 mb-1">Risk Score</p>
                  <p className="text-sm font-black font-mono">{selectedAlert.riskScore}/100</p>
                </div>
              </div>
              <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Add review notes..." rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <button onClick={() => updateAlertStatus(selectedAlert?._id, 'under_review')}
              className="px-4 py-2 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 text-xs font-black uppercase hover:bg-yellow-500/20 transition-all flex items-center gap-1">
              <Clock size={12} /> Review
            </button>
            <button onClick={() => updateAlertStatus(selectedAlert?._id, 'false_positive')}
              className="px-4 py-2 rounded-xl bg-slate-500/10 text-slate-400 border border-slate-500/30 text-xs font-black uppercase hover:bg-slate-500/20 transition-all flex items-center gap-1">
              <XCircle size={12} /> False Positive
            </button>
            <button onClick={() => updateAlertStatus(selectedAlert?._id, 'resolved')}
              className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase hover:bg-emerald-500/20 transition-all flex items-center gap-1">
              <CheckCircle2 size={12} /> Resolve
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AmlCompliance;
