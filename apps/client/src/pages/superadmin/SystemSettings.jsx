import { useState, useEffect } from 'react';
import {
  DollarSign,
  Sliders,
  Globe,
  Mail,
  Save,
  RotateCcw,
  Sparkles,
  Zap,
  Shield,
  Layout,
  ChevronRight,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import ModernSlider from '@/components/ui/ModernSlider';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SystemSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('plans');
  const [showResetDialog, setShowResetDialog] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/system-settings');
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to fetch system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/system-settings', settings);
      toast.success('Settings updated successfully');
      fetchSettings();
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      await api.post('/system-settings/reset');
      toast.success('Settings restored to defaults');
      setShowResetDialog(false);
      fetchSettings();
    } catch (error) {
      console.error('Failed to reset settings:', error);
      toast.error('Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  const updatePlan = (planName, field, value) => {
    setSettings((prev) => ({
      ...prev,
      subscriptionPlans: prev.subscriptionPlans.map((plan) =>
        plan.name === planName ? { ...plan, [field]: value } : plan,
      ),
    }));
  };

  const updatePlanLimit = (planName, limitField, value) => {
    setSettings((prev) => ({
      ...prev,
      subscriptionPlans: prev.subscriptionPlans.map((plan) =>
        plan.name === planName
          ? {
              ...plan,
              limits: { ...plan.limits, [limitField]: parseInt(value) || 0 },
            }
          : plan,
      ),
    }));
  };

  const addFeature = (planName) => {
    setSettings((prev) => ({
      ...prev,
      subscriptionPlans: prev.subscriptionPlans.map((plan) =>
        plan.name === planName
          ? { ...plan, features: [...(plan.features || []), ''] }
          : plan,
      ),
    }));
  };

  const updateFeature = (planName, index, value) => {
    setSettings((prev) => ({
      ...prev,
      subscriptionPlans: prev.subscriptionPlans.map((plan) =>
        plan.name === planName
          ? {
              ...plan,
              features: plan.features.map((f, i) => (i === index ? value : f)),
            }
          : plan,
      ),
    }));
  };

  const removeFeature = (planName, index) => {
    setSettings((prev) => ({
      ...prev,
      subscriptionPlans: prev.subscriptionPlans.map((plan) =>
        plan.name === planName
          ? {
              ...plan,
              features: plan.features.filter((_, i) => i !== index),
            }
          : plan,
      ),
    }));
  };

  const tabs = [
    {
      id: 'plans',
      label: 'Subscription Plans',
      icon: DollarSign,
      desc: 'Pricing & Tier Limits',
    },
    {
      id: 'defaults',
      label: 'Default Values',
      icon: Sliders,
      desc: 'Global Parameter Rules',
    },
    {
      id: 'platform',
      label: 'Platform Config',
      icon: Globe,
      desc: 'General Infrastructure',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-[2rem]" />
        <div className="grid grid-cols-4 gap-8">
          <Skeleton className="h-[400px] rounded-[2.5rem]" />
          <Skeleton className="col-span-3 h-[600px] rounded-[3rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-8rem)] pb-12 animate-in fade-in duration-1000">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      {/* Header Section */}
      <PageHeader
        title="Engine Control"
        description="Master configuration for the entire lending ecosystem."
        className="mb-10"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowResetDialog(true)}
            className="group flex items-center justify-center gap-2.5 px-6 h-12 rounded-2xl bg-muted/50 text-muted-foreground hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100 transition-all duration-300 font-bold text-xs uppercase tracking-widest active:scale-95"
          >
            <RotateCcw
              size={14}
              className="group-hover:rotate-[-180deg] transition-transform duration-500"
            />
            Reset Factory Defaults
          </button>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="gradient"
            className="h-12 px-10 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all duration-300"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Core...
              </>
            ) : (
              <>
                <Save size={14} className="mr-2" />
                Synchronize Changes
              </>
            )}
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="p-2 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] shadow-2xl shadow-black/5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full group flex items-center gap-4 p-4 rounded-[1.8rem] transition-all duration-500 relative overflow-hidden',
                    isActive
                      ? 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-xl shadow-primary/20 scale-[1.02] z-10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-slate-800/60',
                  )}
                >
                  <div
                    className={cn(
                      'p-3 rounded-2xl transition-all duration-500',
                      isActive
                        ? 'bg-white/20'
                        : 'bg-muted/50 group-hover:scale-110 group-hover:rotate-3',
                    )}
                  >
                    <Icon size={18} strokeWidth={isActive ? 3 : 2} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-xs uppercase tracking-widest leading-none mb-1">
                      {tab.label}
                    </p>
                    <p
                      className={cn(
                        'text-[10px] font-medium opacity-60',
                        isActive ? 'text-white' : 'text-muted-foreground',
                      )}
                    >
                      {tab.desc}
                    </p>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="activeTabGlow"
                      className="absolute inset-0 bg-white/10 blur-xl opacity-50"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700">
              <Sparkles size={100} />
            </div>
            <h4 className="font-black text-[10px] uppercase tracking-[0.3em] mb-3 opacity-80">
              System Health
            </h4>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold opacity-80">Encryption</span>
                <span className="px-2 py-0.5 rounded-md bg-white/20 font-black tracking-widest">
                  AES-256
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold opacity-80">Redundancy</span>
                <span className="px-2 py-0.5 rounded-md bg-white/20 font-black tracking-widest">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic Content Area */}
        <main className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/50 dark:border-slate-800/50 rounded-[3rem] p-8 sm:p-12 shadow-2xl shadow-black/5 min-h-[600px] relative overflow-hidden"
            >
              {activeTab === 'plans' && (
                <div className="space-y-12">
                  <header className="flex items-center gap-4 mb-10">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center">
                      <Zap className="text-primary w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">
                        Subscription Matrix
                      </h2>
                      <p className="text-sm text-muted-foreground font-medium">
                        Define pricing strategy and enterprise resource limits.
                      </p>
                    </div>
                  </header>

                  <div className="grid grid-cols-1 gap-8">
                    {settings.subscriptionPlans.map((plan, index) => (
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={plan.name}
                        className="group relative bg-white/50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-8 hover:shadow-3xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-muted dark:bg-slate-700 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                              <Shield
                                className="text-muted-foreground group-hover:text-primary transition-colors"
                                size={20}
                              />
                            </div>
                            <h3 className="text-xl font-black">{plan.name}</h3>
                          </div>
                          <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-2xl pl-5 border border-slate-200 dark:border-white/5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              Tier Pricing
                            </span>
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-border/50 text-foreground font-black">
                              <span className="text-primary opacity-50">$</span>
                              <input
                                type="number"
                                value={plan.price}
                                onChange={(e) =>
                                  updatePlan(
                                    plan.name,
                                    'price',
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                className="w-16 bg-transparent border-none focus:ring-0 p-0 text-right"
                              />
                              <span className="text-[10px] text-muted-foreground">
                                /mo
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
                          {[
                            {
                              label: 'Max Customers',
                              field: 'maxCustomers',
                              count: plan.limits.maxCustomers,
                            },
                            {
                              label: 'Max Loans',
                              field: 'maxLoans',
                              count: plan.limits.maxLoans,
                            },
                            {
                              label: 'Team Members',
                              field: 'maxMembers',
                              count: plan.limits.maxMembers,
                            },
                            {
                              label: 'Max Branches',
                              field: 'maxBranches',
                              count: plan.limits.maxBranches,
                            },
                          ].map((limit) => (
                            <div
                              key={limit.field}
                              className="bg-white/40 dark:bg-slate-900/40 p-5 rounded-[1.8rem] border border-slate-200 dark:border-white/5"
                            >
                              <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-3 ml-1">
                                {limit.label}
                              </label>
                              <div className="relative group/input">
                                <input
                                  type="number"
                                  value={limit.count}
                                  onChange={(e) =>
                                    updatePlanLimit(
                                      plan.name,
                                      limit.field,
                                      e.target.value,
                                    )
                                  }
                                  className="w-full bg-white dark:bg-slate-800/80 h-11 px-4 rounded-xl border border-border/50 font-bold text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                />
                                {limit.count === -1 && (
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <Sparkles
                                      size={14}
                                      className="text-primary"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                              Plan Description
                            </label>
                            <input
                              type="text"
                              value={plan.description || ''}
                              onChange={(e) =>
                                updatePlan(
                                  plan.name,
                                  'description',
                                  e.target.value,
                                )
                              }
                              placeholder="e.g. For growing businesses"
                              className="w-full bg-white/40 dark:bg-slate-900/40 h-9 px-4 rounded-xl border border-border/50 font-medium text-xs focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                            />
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between ml-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Tier Features
                              </label>
                              <button
                                onClick={() => addFeature(plan.name)}
                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
                              >
                                <Plus size={12} />
                                Add String
                              </button>
                            </div>
                            <div className="space-y-2">
                              {(plan.features || []).map((feature, idx) => (
                                <div
                                  key={idx}
                                  className="group/feature flex items-center gap-2"
                                >
                                  <input
                                    type="text"
                                    value={feature}
                                    onChange={(e) =>
                                      updateFeature(
                                        plan.name,
                                        idx,
                                        e.target.value,
                                      )
                                    }
                                    className="flex-1 bg-white/40 dark:bg-slate-900/40 h-8 px-3 rounded-lg border border-border/50 text-[11px] font-medium focus:border-primary outline-none transition-all"
                                  />
                                  <button
                                    onClick={() =>
                                      removeFeature(plan.name, idx)
                                    }
                                    className="p-2.5 rounded-xl bg-red-500/5 text-red-500 opacity-0 group-hover/feature:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'defaults' && (
                <div className="space-y-12">
                  <header className="flex items-center gap-4 mb-10">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center">
                      <Layout className="text-indigo-500 w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">
                        Global Guardrails
                      </h2>
                      <p className="text-sm text-muted-foreground font-medium">
                        Set default system parameters and financial constraints.
                      </p>
                    </div>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-6">
                        <div className="w-5 h-px bg-primary/30" />
                        Base Loan Rules
                      </h3>
                      <div className="space-y-2">
                        <div className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 py-8">
                          <ModernSlider
                            label="Standard APR (%)"
                            min={1}
                            max={50}
                            step={0.1}
                            value={settings.defaultInterestRate}
                            suffix="%"
                            onChange={(val) =>
                              setSettings({
                                ...settings,
                                defaultInterestRate: val,
                              })
                            }
                          />
                        </div>

                        <div className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 py-8">
                          <ModernSlider
                            label="Default Duration (Months)"
                            min={1}
                            max={84}
                            value={settings.defaultLoanTerm}
                            onChange={(val) =>
                              setSettings({
                                ...settings,
                                defaultLoanTerm: parseInt(val),
                              })
                            }
                          />
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2 mb-6">
                        <div className="w-5 h-px bg-emerald-600/30" />
                        Max Capital disbursement
                      </h3>
                      <div className="bg-white/50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-8 space-y-6">
                        {['Free', 'Basic', 'Pro'].map((tier) => (
                          <div
                            key={tier}
                            className="flex items-center justify-between group"
                          >
                            <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                              {tier} Tier
                            </span>
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-border/40 px-3 py-1.5 rounded-xl group-focus-within:border-emerald-500 transition-colors">
                              <span className="text-[10px] font-black opacity-30">
                                $
                              </span>
                              <input
                                type="number"
                                value={settings.maxLoanLimits[tier]}
                                onChange={(e) =>
                                  setSettings({
                                    ...settings,
                                    maxLoanLimits: {
                                      ...settings.maxLoanLimits,
                                      [tier]: parseInt(e.target.value) || 0,
                                    },
                                  })
                                }
                                className="w-24 bg-transparent border-none focus:ring-0 p-0 text-right font-black text-sm"
                              />
                            </div>
                          </div>
                        ))}
                        <p className="text-[10px] text-muted-foreground/60 leading-relaxed pt-4 border-t border-border/40">
                          * Set to -1 for unlimited capital injection capacity
                          on specific tiers.
                        </p>
                      </div>
                    </section>
                  </div>
                </div>
              )}

              {activeTab === 'platform' && (
                <div className="space-y-12">
                  <header className="flex items-center gap-4 mb-10">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-blue-500/10 flex items-center justify-center">
                      <Globe className="text-blue-500 w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">
                        Infrastructure & Identity
                      </h2>
                      <p className="text-sm text-muted-foreground font-medium">
                        System-wide branding and platform-level security
                        controls.
                      </p>
                    </div>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-4">
                            Platform Entity Name
                          </label>
                          <input
                            type="text"
                            value={settings.platformName}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                platformName: e.target.value,
                              })
                            }
                            className="w-full bg-white/40 dark:bg-slate-800/40 h-14 px-6 rounded-2xl border border-border/50 font-black text-lg focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-4">
                            Platform Descriptor
                          </label>
                          <textarea
                            value={settings.platformDescription}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                platformDescription: e.target.value,
                              })
                            }
                            rows={4}
                            className="w-full bg-white/40 dark:bg-slate-800/40 p-6 rounded-[2rem] border border-border/50 font-medium text-sm leading-relaxed focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-4">
                            NOC / Support Endpoint
                          </label>
                          <div className="relative">
                            <Mail
                              className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground"
                              size={18}
                            />
                            <input
                              type="email"
                              value={settings.supportEmail}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  supportEmail: e.target.value,
                                })
                              }
                              className="w-full bg-white/40 dark:bg-slate-800/40 h-14 pl-14 pr-6 rounded-2xl border border-border/50 font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-1 space-y-6">
                      <div className="bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-150 transition-transform duration-700 pointer-events-none">
                          <AlertCircle size={120} />
                        </div>

                        <div className="flex items-center gap-3 text-red-600 mb-6">
                          <Shield size={20} />
                          <h3 className="font-black text-[10px] uppercase tracking-[0.2em]">
                            Danger Zone
                          </h3>
                        </div>

                        <div>
                          <p className="font-black text-sm mb-2 text-foreground">
                            Maintenance Mode
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-relaxed mb-6 font-medium">
                            Isolate the engine for urgent updates. This will
                            block all transaction and entry points.
                          </p>

                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.maintenanceMode}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  maintenanceMode: e.target.checked,
                                })
                              }
                              className="sr-only peer"
                            />
                            <div className="w-16 h-9 bg-muted/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[28px] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all after:shadow-lg peer-checked:bg-red-600 transition-colors duration-500"></div>
                            <span className="ml-4 text-xs font-black uppercase tracking-wider text-muted-foreground peer-checked:text-red-600">
                              {settings.maintenanceMode ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </label>
                        </div>

                        {settings.maintenanceMode && (
                          <div className="pt-4 border-t border-red-500/10 space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-red-600/60 ml-1">
                              Estimated Duration
                            </label>
                            <div className="relative">
                              <Clock
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500/40"
                                size={14}
                              />
                              <input
                                type="text"
                                value={settings.estimatedMaintenanceTime || ''}
                                onChange={(e) =>
                                  setSettings({
                                    ...settings,
                                    estimatedMaintenanceTime: e.target.value,
                                  })
                                }
                                placeholder="e.g. 25 mins"
                                className="w-full bg-red-500/5 h-9 pl-9 pr-4 rounded-lg border border-red-500/10 text-[11px] font-bold focus:border-red-500/30 outline-none transition-all placeholder:text-red-500/20"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
                        <h4 className="font-black text-[10px] uppercase tracking-widest opacity-40 mb-4">
                          Session Control
                        </h4>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-bold opacity-70">
                            Token TTL
                          </span>
                          <span className="text-xs font-black">24h</span>
                        </div>
                        <div className="flex items-center justify-between mb-8">
                          <span className="text-xs font-bold opacity-70">
                            Auto-Revoke
                          </span>
                          <span className="text-xs font-black text-emerald-400">
                            ENABLED
                          </span>
                        </div>
                        <Button
                          onClick={handleSave}
                          disabled={saving}
                          className="w-full h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-[10px] border border-white/10 transition-all"
                        >
                          {saving ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            'Apply Platform Config'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modernized Dialogs */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="rounded-[2.5rem] border-border/40 backdrop-blur-3xl p-8">
          <AlertDialogHeader>
            <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/10 flex items-center justify-center mb-6">
              <RotateCcw className="text-red-600 w-8 h-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-black tracking-tight">
              Factory Reset Initiation
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium text-base leading-relaxed">
              This will overwrite all current system parameters with hardcoded
              factory defaults. All custom subscription limits and interest
              rules will be purged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3 sm:gap-0">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl border-border font-bold hover:bg-muted active:scale-95 transition-all">
              Abort Project
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="h-12 px-10 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-red-500/20 hover:bg-red-700 active:scale-95 transition-all"
            >
              Confirm purging
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SystemSettings;
