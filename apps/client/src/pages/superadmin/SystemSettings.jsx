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
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Clock,
  Users,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/axios';
import { SettingsPageSkeleton } from '@/components/ui/PageSkeletons';
import { ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ModernSlider from '@/components/ui/ModernSlider';
import { cn } from '@/lib/utils';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';

const SystemSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('plans');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [uploadingLogoIndex, setUploadingLogoIndex] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/system-settings/full');
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

  const handleTestSmtp = async () => {
    if (!testEmail) {
      toast.error('Please enter a recipient email');
      return;
    }

    try {
      setTestingSmtp(true);
      const { data } = await api.post('/system-settings/test-connection', {
        to: testEmail,
      });
      toast.success(data.message || 'Test email sent successfully');
    } catch (error) {
      console.error('SMTP test failed:', error);
      toast.error(error.response?.data?.message || 'SMTP test failed');
    } finally {
      setTestingSmtp(false);
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

  const addPartner = () => {
    setSettings((prev) => ({
      ...prev,
      partners: [
        ...(prev.partners || []),
        { name: 'New Partner', logoUrl: '', active: true },
      ],
    }));
  };

  const updatePartner = (index, field, value) => {
    setSettings((prev) => {
      const newPartners = [...(prev.partners || [])];
      newPartners[index] = { ...newPartners[index], [field]: value };
      return { ...prev, partners: newPartners };
    });
  };

  const removePartner = (index) => {
    setSettings((prev) => {
      const newPartners = [...(prev.partners || [])];
      newPartners.splice(index, 1);
      return { ...prev, partners: newPartners };
    });
  };

  const handleLogoUpload = async (index, file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be less than 2MB');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    setUploadingLogoIndex(index);
    try {
      const { data } = await api.post(
        '/system-settings/upload-partner-logo',
        formData,
      );
      if (data.success) {
        updatePartner(index, 'logoUrl', data.logoUrl);
        toast.success(
          'Partner logo uploaded temporarily. Save settings to persist.',
        );
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogoIndex(null);
    }
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
    {
      id: 'partners',
      label: 'Trusted Partners',
      icon: Users,
      desc: 'Landing Page Logos',
    },
  ];

  if (loading) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="relative min-h-[calc(100vh-8rem)] pb-12 animate-in fade-in duration-1000 space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-6 pt-1">
        <div className="space-y-2 max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
            Super admin
          </p>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-[-0.035em] leading-tight text-slate-900 dark:text-white">
            Engine <span className="text-primary">control</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Master configuration for the entire lending ecosystem.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={() => setShowResetDialog(true)}
            className="group inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-all duration-300 font-bold text-[12px]"
          >
            <RotateCcw
              size={13}
              className="group-hover:rotate-[-180deg] transition-transform duration-500"
            />
            Reset defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating core...
              </>
            ) : (
              <>
                <Save size={14} strokeWidth={2.5} />
                Sync changes
                <span className="ml-0.5 w-6 h-6 rounded-full bg-white text-primary flex items-center justify-center">
                  <ArrowUpRight size={12} strokeWidth={3} />
                </span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="p-2 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] shadow-2xl shadow-black/5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  variant="ghost"
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
                    <p className="font-semibold text-[11px] uppercase tracking-widest leading-none mb-1">
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
                </Button>
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
        <main className="lg:col-span-3 mb-40 sm:mb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/50 dark:border-slate-800/50 rounded-[3rem] p-4 sm:p-12 shadow-2xl shadow-black/5 min-h-[600px] relative overflow-hidden"
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
                              <Input
                                type="number"
                                value={plan.price}
                                onChange={(e) =>
                                  updatePlan(
                                    plan.name,
                                    'price',
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                className="h-auto w-16 bg-transparent border-none focus:ring-0 p-0 text-right"
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
                                <Input
                                  type="number"
                                  value={limit.count}
                                  onChange={(e) =>
                                    updatePlanLimit(
                                      plan.name,
                                      limit.field,
                                      e.target.value,
                                    )
                                  }
                                  className="bg-white dark:bg-slate-800/80 h-11 px-4 rounded-xl border border-border/50 font-bold focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
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
                            <Input
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
                              className="bg-white/40 dark:bg-slate-900/40 h-9 px-4 rounded-xl border border-border/50 font-medium text-xs focus:ring-4 focus:ring-primary/5 transition-all"
                            />
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between ml-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Tier Features
                              </label>
                              <Button
                                variant="ghost"
                                onClick={() => addFeature(plan.name)}
                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
                              >
                                <Plus size={12} />
                                Add String
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {(plan.features || []).map((feature, idx) => (
                                <div
                                  key={idx}
                                  className="group/feature flex items-center gap-2"
                                >
                                  <Input
                                    type="text"
                                    value={feature}
                                    onChange={(e) =>
                                      updateFeature(
                                        plan.name,
                                        idx,
                                        e.target.value,
                                      )
                                    }
                                    className="flex-1 bg-white/40 dark:bg-slate-900/40 h-8 px-3 rounded-lg border border-border/50 text-[11px] font-medium focus:border-primary transition-all"
                                  />
                                  <Button
                                    variant="ghost"
                                    onClick={() =>
                                      removeFeature(plan.name, idx)
                                    }
                                    className="p-2.5 rounded-xl bg-red-500/5 text-red-500 opacity-0 group-hover/feature:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                                  >
                                    <Trash2 size={12} />
                                  </Button>
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
                              <Input
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
                                className="h-auto w-24 bg-transparent border-none focus:ring-0 p-0 text-right font-black"
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
                          <Input
                            type="text"
                            value={settings.platformName}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                platformName: e.target.value,
                              })
                            }
                            className="bg-white/40 dark:bg-slate-800/40 h-14 px-6 rounded-2xl border border-border/50 font-black text-lg focus:ring-4 focus:ring-primary/5 transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-4">
                            Platform Descriptor
                          </label>
                          <Textarea
                            value={settings.platformDescription}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                platformDescription: e.target.value,
                              })
                            }
                            rows={4}
                            className="bg-white/40 dark:bg-slate-800/40 p-6 rounded-[2rem] border border-border/50 font-medium leading-relaxed focus:ring-4 focus:ring-primary/5 transition-all resize-none"
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
                            <Input
                              type="email"
                              value={settings.supportEmail}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  supportEmail: e.target.value,
                                })
                              }
                              className="bg-white/40 dark:bg-slate-800/40 h-14 pl-14 pr-6 rounded-2xl border border-border/50 font-bold focus:ring-4 focus:ring-primary/5 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-1 space-y-6">
                      <div className="bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group mb-40 sm:mb-0">
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
                              <Input
                                type="text"
                                value={settings.estimatedMaintenanceTime || ''}
                                onChange={(e) =>
                                  setSettings({
                                    ...settings,
                                    estimatedMaintenanceTime: e.target.value,
                                  })
                                }
                                placeholder="e.g. 25 mins"
                                className="bg-red-500/5 h-9 pl-9 pr-4 rounded-lg border border-red-500/10 text-[11px] font-bold focus:border-red-500/30 transition-all placeholder:text-red-500/20"
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

                      {/* SMTP Utility */}
                      <div className="bg-emerald-900/40 backdrop-blur-3xl border border-emerald-500/20 rounded-[2.5rem] p-8 text-white">
                        <h4 className="font-black text-[10px] uppercase tracking-widest opacity-40 mb-4 flex items-center gap-2">
                          <Mail size={12} />
                          SMTP Relay Diagnostic
                        </h4>
                        <div className="space-y-4">
                          <p className="text-[10px] text-emerald-100/60 leading-relaxed font-medium">
                            Verify your SMTP credentials by sending a secure
                            diagnostic payload to an external endpoint.
                          </p>
                          <div className="relative">
                            <Input
                              type="email"
                              value={testEmail}
                              onChange={(e) => setTestEmail(e.target.value)}
                              placeholder="recipient@example.com"
                              className="bg-emerald-950/40 h-11 px-4 rounded-xl border border-emerald-500/10 text-xs font-bold focus:border-emerald-500/30 transition-all placeholder:text-emerald-500/20"
                            />
                          </div>
                          <Button
                            onClick={handleTestSmtp}
                            disabled={testingSmtp}
                            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-500/10 transition-all"
                          >
                            {testingSmtp ? (
                              <>
                                <Loader2
                                  size={12}
                                  className="mr-2 animate-spin"
                                />
                                Analyzing Relay...
                              </>
                            ) : (
                              'Dispatch Test Email'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'partners' && (
                <div className="space-y-12">
                  <header className="flex items-center gap-4 mb-10">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center">
                      <Users className="text-indigo-500 w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-black tracking-tight">
                        Trusted Partners
                      </h2>
                      <p className="text-sm text-muted-foreground font-medium">
                        Manage the partner logos displayed on the public landing
                        page.
                      </p>
                    </div>
                    <Button
                      onClick={addPartner}
                      variant="outline"
                      className="rounded-xl"
                    >
                      <Plus size={16} className="mr-2" /> Add Partner
                    </Button>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(settings.partners || []).map((partner, index) => (
                      <div
                        key={index}
                        className="bg-white/50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-200 dark:border-white/5 p-6 flex flex-col gap-6 relative group"
                      >
                        <Button
                          variant="ghost"
                          onClick={() => removePartner(index)}
                          className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                        >
                          <Trash2 size={16} />
                        </Button>

                        <div className="flex items-center gap-6">
                          <div
                            className="relative w-24 h-24 rounded-2xl bg-muted/30 border-2 border-dashed border-border/50 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors group/logo"
                            onClick={() =>
                              document
                                .getElementById(`partner-logo-${index}`)
                                .click()
                            }
                          >
                            {uploadingLogoIndex === index ? (
                              <div className="flex flex-col items-center justify-center">
                                <Loader2
                                  className="animate-spin text-primary mb-1"
                                  size={24}
                                />
                                <span className="text-[9px] font-black uppercase text-primary">
                                  Uploading
                                </span>
                              </div>
                            ) : partner.logoUrl ? (
                              <img
                                src={partner.logoUrl}
                                alt="Logo"
                                className="w-full h-full object-contain p-2"
                              />
                            ) : (
                              <div className="text-center">
                                <Upload
                                  size={20}
                                  className="mx-auto text-muted-foreground opacity-50 mb-1"
                                />
                                <span className="text-[9px] font-black uppercase text-muted-foreground">
                                  Upload
                                </span>
                              </div>
                            )}
                            {uploadingLogoIndex !== index && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                                <Upload className="text-white" size={24} />
                              </div>
                            )}
                            <input
                              type="file"
                              id={`partner-logo-${index}`}
                              className="hidden"
                              accept="image/*"
                              onChange={(e) =>
                                handleLogoUpload(index, e.target.files[0])
                              }
                            />
                          </div>

                          <div className="flex-1 space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">
                                Partner Name
                              </label>
                              <Input
                                type="text"
                                value={partner.name}
                                onChange={(e) =>
                                  updatePartner(index, 'name', e.target.value)
                                }
                                className="bg-white dark:bg-slate-900 h-10 px-4 rounded-xl border border-border/50 font-bold focus:border-primary transition-all"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">
                                Visibility
                              </label>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={partner.active}
                                  onChange={(e) =>
                                    updatePartner(
                                      index,
                                      'active',
                                      e.target.checked,
                                    )
                                  }
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modernized Dialogs */}
      <ConfirmActionModal
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={handleReset}
        loading={saving}
        title="Reset Factory Defaults"
        description="Are you sure you want to restore all system settings to their factory defaults? This will overwrite your current subscription tiers, interest rates, and platform configuration. This action cannot be undone."
        confirmText="Reset Now"
        variant="warning"
      />
    </div>
  );
};

export default SystemSettings;
