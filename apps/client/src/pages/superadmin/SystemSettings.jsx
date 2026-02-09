import { useState, useEffect } from 'react';
import {
  Settings2,
  DollarSign,
  Sliders,
  Globe,
  Mail,
  Save,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import api from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
      toast.success('Settings saved successfully');
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
      toast.success('Settings reset to defaults');
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

  const tabs = [
    { id: 'plans', label: 'Subscription Plans', icon: DollarSign },
    { id: 'defaults', label: 'Default Values', icon: Sliders },
    { id: 'platform', label: 'Platform Config', icon: Globe },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="relative space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Background Gradients */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <PageHeader
        title="System Settings"
        description="Configure platform-wide settings and defaults"
        className="relative z-10"
        bodyClassName="w-full"
      >
        <div className="flex gap-3 flex-col-reverse md:flex-row w-full">
          <button
            onClick={() => setShowResetDialog(true)}
            className="flex items-center px-6 h-11 rounded-full border border-destructive/20 text-destructive hover:bg-destructive/5 text-[11px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 shadow-sm w-full md:w-auto justify-center gap-2"
          >
            <RotateCcw size={14} className="stroke-[3]" />
            Reset Defaults
          </button>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="gradient"
            className="px-8 h-11 rounded-full text-[11px] font-black uppercase tracking-widest gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={14} className="stroke-[3]" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </PageHeader>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-2 bg-card/50 backdrop-blur-md rounded-[2rem] p-4 border border-border/50 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 group ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:scale-[1.02]'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${activeTab === tab.id ? 'bg-white/20' : 'bg-muted group-hover:bg-background'}`}
                  >
                    <Icon
                      size={16}
                      className={
                        activeTab === tab.id
                          ? 'text-primary-foreground'
                          : 'text-muted-foreground group-hover:text-primary'
                      }
                    />
                  </div>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="lg:col-span-3">
          <div className="rounded-[2.5rem] border border-border/50 bg-card/50 backdrop-blur-md p-6 sm:p-8 shadow-sm relative overflow-hidden">
            {activeTab === 'plans' && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center gap-3 text-muted-foreground pb-6 border-b border-border/50">
                  <div className="p-2.5 bg-primary/10 rounded-xl">
                    <DollarSign size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">
                      Subscription Plans
                    </h3>
                    <p className="text-sm font-medium opacity-70">
                      Configure pricing and feature limits for each tier
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {settings.subscriptionPlans.map((plan) => (
                    <div
                      key={plan.name}
                      className="group border border-border/50 bg-background/50 hover:bg-background/80 rounded-[2rem] p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/20"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black flex items-center gap-3">
                          {plan.name} Plan
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary uppercase tracking-wider">
                            ${plan.price}/mo
                          </span>
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                            Monthly Price ($)
                          </label>
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
                            className="w-full px-4 h-11 rounded-xl border border-border/50 bg-muted/30 focus:bg-background text-sm font-medium transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                            Max Customers
                          </label>
                          <input
                            type="number"
                            value={plan.limits.maxCustomers}
                            onChange={(e) =>
                              updatePlanLimit(
                                plan.name,
                                'maxCustomers',
                                e.target.value,
                              )
                            }
                            placeholder="-1 = unlimited"
                            className="w-full px-4 h-11 rounded-xl border border-border/50 bg-muted/30 focus:bg-background text-sm font-medium transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                            Max Loans
                          </label>
                          <input
                            type="number"
                            value={plan.limits.maxLoans}
                            onChange={(e) =>
                              updatePlanLimit(
                                plan.name,
                                'maxLoans',
                                e.target.value,
                              )
                            }
                            placeholder="-1 = unlimited"
                            className="w-full px-4 h-11 rounded-xl border border-border/50 bg-muted/30 focus:bg-background text-sm font-medium transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                            Max Team Members
                          </label>
                          <input
                            type="number"
                            value={plan.limits.maxMembers}
                            onChange={(e) =>
                              updatePlanLimit(
                                plan.name,
                                'maxMembers',
                                e.target.value,
                              )
                            }
                            placeholder="-1 = unlimited"
                            className="w-full px-4 h-11 rounded-xl border border-border/50 bg-muted/30 focus:bg-background text-sm font-medium transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'defaults' && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center gap-3 text-muted-foreground pb-6 border-b border-border/50">
                  <div className="p-2.5 bg-primary/10 rounded-xl">
                    <Sliders size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">
                      Default Settings
                    </h3>
                    <p className="text-sm font-medium opacity-70">
                      Set global defaults for loans and limits
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                        Default Interest Rate (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={settings.defaultInterestRate}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              defaultInterestRate:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full pl-4 pr-10 h-11 rounded-xl border border-border/50 bg-muted/30 focus:bg-background text-sm font-medium transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm pointer-events-none">
                          %
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                        Default Loan Term (months)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={settings.defaultLoanTerm}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              defaultLoanTerm: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-full pl-4 pr-16 h-11 rounded-xl border border-border/50 bg-muted/30 focus:bg-background text-sm font-medium transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs pointer-events-none uppercase">
                          Months
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-border/50 rounded-[2rem] p-6 bg-background/30">
                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-6 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Maximum Loan Limits by Plan
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                          Free Plan Limit ($)
                        </label>
                        <input
                          type="number"
                          value={settings.maxLoanLimits.Free}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              maxLoanLimits: {
                                ...settings.maxLoanLimits,
                                Free: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full px-4 h-11 rounded-xl border border-border/50 bg-background/50 focus:bg-background text-sm font-medium transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                          Basic Plan Limit ($)
                        </label>
                        <input
                          type="number"
                          value={settings.maxLoanLimits.Basic}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              maxLoanLimits: {
                                ...settings.maxLoanLimits,
                                Basic: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full px-4 h-11 rounded-xl border border-border/50 bg-background/50 focus:bg-background text-sm font-medium transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                          Pro Plan Limit ($)
                        </label>
                        <input
                          type="number"
                          value={settings.maxLoanLimits.Pro}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              maxLoanLimits: {
                                ...settings.maxLoanLimits,
                                Pro: parseInt(e.target.value) || -1,
                              },
                            })
                          }
                          placeholder="-1 for unlimited"
                          className="w-full px-4 h-11 rounded-xl border border-border/50 bg-background/50 focus:bg-background text-sm font-medium transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'platform' && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center gap-3 text-muted-foreground pb-6 border-b border-border/50">
                  <div className="p-2.5 bg-primary/10 rounded-xl">
                    <Globe size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">
                      Platform Configuration
                    </h3>
                    <p className="text-sm font-medium opacity-70">
                      General settings and branding options
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                      Platform Name
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
                      className="w-full px-4 h-11 rounded-xl border border-border/50 bg-muted/30 focus:bg-background text-sm font-bold transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                      Platform Description
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
                      className="w-full p-4 rounded-xl border border-border/50 bg-muted/30 focus:bg-background text-sm font-medium transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                      Support Email
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                      <input
                        type="email"
                        value={settings.supportEmail}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            supportEmail: e.target.value,
                          })
                        }
                        className="w-full pl-11 pr-4 h-11 rounded-xl border border-border/50 bg-muted/30 focus:bg-background text-sm font-medium transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-6 rounded-[1.5rem] border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors duration-300">
                    <div className="space-y-1">
                      <p className="font-bold text-foreground">
                        Maintenance Mode
                      </p>
                      <p className="text-sm font-medium text-muted-foreground opacity-80">
                        Temporarily disable user access to the platform
                      </p>
                    </div>
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
                      <div className="w-14 h-8 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-primary-foreground after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-primary after:border-muted after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-foreground shadow-inner"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">
              Reset to Default Settings?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">
              This will reset all system settings to their default values. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-none bg-muted font-bold hover:bg-muted/80">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-destructive hover:bg-destructive/90 rounded-xl font-bold text-white shadow-lg shadow-destructive/30"
            >
              Reset Settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SystemSettings;
