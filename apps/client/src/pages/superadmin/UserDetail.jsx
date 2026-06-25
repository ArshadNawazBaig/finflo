import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Mail,
  Calendar,
  CreditCard,
  Users,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Edit,
  Save,
  X,
  ArrowLeft,
  Briefcase,
} from 'lucide-react';
import api from '@/lib/axios';
import { capitalize, cn } from '@/lib/utils';

import { Skeleton } from '@/components/ui/skeleton';
import { ProfilePageSkeleton } from '@/components/ui/PageSkeletons';
import PillSelect from '@/components/ui/PillSelect';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ui/FormField';
import StatsCard from '@/components/StatsCard';
import EmptyState from '@/components/ui/EmptyState';

const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [togglingPayroll, setTogglingPayroll] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get(`/super-admin/users/${id}`);
        setData(data);
        setFormData({
          name: data.user.name,
          businessName: data.user.businessName || '',
          plan: data.user.plan,
          isActive: data.user.isActive,
          durationMonths: '',
        });
      } catch (error) {
        console.error('Failed to fetch user:', error);
        toast.error('Failed to load user details');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put(`/super-admin/users/${id}`, formData);
      toast.success('User updated successfully');
      setEditing(false);
      // Refresh data
      const { data: refreshed } = await api.get(`/super-admin/users/${id}`);
      setData(refreshed);
    } catch (error) {
      toast.error('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePayroll = async () => {
    try {
      setTogglingPayroll(true);
      const next = !data?.user?.payrollEnabled;
      const { data: resp } = await api.post(
        `/super-admin/users/${id}/toggle-payroll`,
        { enabled: next },
      );
      toast.success(resp.message || `Payroll ${next ? 'enabled' : 'disabled'}`);
      setData((prev) => ({
        ...prev,
        user: { ...prev.user, payrollEnabled: next },
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to toggle payroll');
    } finally {
      setTogglingPayroll(false);
    }
  };

  // Safe destructuring
  const user = data?.user || {};
  const stats = data?.stats || {};
  const recentCustomers = data?.recentCustomers || [];
  const recentMembers = data?.recentMembers || [];
  const recentLoans = data?.recentLoans || [];

  if (loading && !data) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-6 pt-1">
        <div className="flex items-start gap-4 max-w-3xl">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mt-1 p-2.5 rounded-full border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all group shrink-0"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </Button>
          <div className="space-y-2 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Business profile
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-[-0.035em] leading-tight text-slate-900 dark:text-white capitalize">
                {editing
                  ? 'Edit business'
                  : capitalize(user.name) || 'User profile'}
              </h1>
              {!editing && (
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em]',
                      user.plan === 'Pro'
                        ? 'bg-primary text-white'
                        : 'bg-primary/10 text-primary',
                    )}
                  >
                    {user.plan}
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em]',
                      user.isActive
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-rose-500/10 text-rose-500',
                    )}
                  >
                    {user.isActive ? (
                      <CheckCircle2 size={10} />
                    ) : (
                      <XCircle size={10} />
                    )}
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              )}
            </div>
            {!editing ? (
              <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5 text-[12px] font-medium">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span className="truncate max-w-[200px]">
                    {capitalize(user.businessName) || 'Independent Agent'}
                  </span>
                </div>
                <div className="hidden sm:block w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <div className="flex items-center gap-1.5 text-[12px] font-medium">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>{user.email}</span>
                </div>
                <div className="hidden sm:block w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <div className="flex items-center gap-1.5 text-[12px] font-medium">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                Modify business details, plan settings, and account status.
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end">
          {!editing ? (
            <Button
              onClick={() => setEditing(true)}
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <Edit size={14} strokeWidth={2.5} /> Edit profile
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setEditing(false)}
                variant="outline"
                className="h-auto px-5 py-3 rounded-full text-[13px] font-bold border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <X size={14} className="mr-1.5" /> Cancel
              </Button>
              <Button
                onClick={handleSave}
                isLoading={saving}
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
              >
                <Save size={14} strokeWidth={2.5} /> Save changes
              </Button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="p-6 sm:p-8 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] animate-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <FormField
              label="Full name"
              htmlFor="name"
              labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 px-1"
            >
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="px-4 h-11 rounded-full border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all capitalize"
              />
            </FormField>
            <FormField
              label="Business name"
              htmlFor="businessName"
              labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 px-1"
            >
              <Input
                id="businessName"
                type="text"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    businessName: e.target.value,
                  })
                }
                className="px-4 h-11 rounded-full border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </FormField>
            <FormField
              label="Service plan"
              labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 px-1"
            >
              <PillSelect
                value={formData.plan}
                onValueChange={(value) =>
                  setFormData({ ...formData, plan: value })
                }
                placeholder="Select plan"
                className="w-full"
                options={[
                  { value: 'Free', label: 'Free' },
                  { value: 'Basic', label: 'Basic' },
                  { value: 'Pro', label: 'Pro' },
                ]}
              />
            </FormField>
            <FormField
              label="Account status"
              labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 px-1"
            >
              <PillSelect
                value={formData.isActive ? 'active' : 'inactive'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    isActive: value === 'active',
                  })
                }
                placeholder="Select status"
                className="w-full"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </FormField>
            {formData.plan && formData.plan !== 'Free' && (
              <FormField
                label="Subscription duration"
                labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 px-1"
                hint={
                  user.nextBillingDate
                    ? `Active until ${new Date(user.nextBillingDate).toLocaleDateString()}. Pick a duration to re-activate from today.`
                    : 'Pick a duration to activate this plan from today.'
                }
              >
                <PillSelect
                  value={formData.durationMonths}
                  onValueChange={(value) =>
                    setFormData({ ...formData, durationMonths: value })
                  }
                  placeholder="Select duration"
                  className="w-full"
                  options={[
                    { value: '1', label: '1 month' },
                    { value: '3', label: '3 months' },
                    { value: '6', label: '6 months' },
                    { value: '12', label: '12 months' },
                  ]}
                />
              </FormField>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading
          ? [...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-[2rem] border border-border/50 bg-card/50 animate-pulse"
              />
            ))
          : [
              {
                title: 'Total Customers',
                amount: stats.customerCount || 0,
                icon: <Users size={20} />,
                color: 'bg-emerald-500 shadow-emerald-500/20',
                subtitle: 'Platform-wide reach',
              },
              {
                title: 'Total Loans',
                amount: stats.loanCount || 0,
                icon: <CreditCard size={20} />,
                color: 'bg-purple-500 shadow-purple-500/20',
                subtitle: 'Total issued portfolios',
              },
              {
                title: 'Active Loans',
                amount: stats.activeLoanCount || 0,
                icon: <TrendingUp size={20} />,
                color: 'bg-amber-500 shadow-amber-500/20',
                subtitle: 'Interest generating assets',
              },
              {
                title: 'Team Members',
                amount: stats.memberCount || 0,
                icon: <Users size={20} />,
                color: 'bg-blue-500 shadow-blue-500/20',
                subtitle: 'Platform operators',
              },
            ].map((stat, i) => (
              <StatsCard
                key={i}
                title={stat.title}
                amount={stat.amount}
                icon={stat.icon}
                color={stat.color}
                subtitle={stat.subtitle}
              />
            ))}
      </div>

      {/* Feature Flags */}
      {user.role === 'admin' && (
        <div className="p-5 sm:p-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
            Feature flags
          </p>
          <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white mb-4">
            Modules
          </h3>
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                <Briefcase size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-extrabold text-[13px] text-slate-900 dark:text-white">
                    Payroll System
                  </p>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em]',
                      user.payrollEnabled
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                    )}
                  >
                    {user.payrollEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium max-w-md">
                  Employee management, automated pay runs, payslips, leaves &
                  attendance.
                </p>
              </div>
            </div>
            <Button
              onClick={handleTogglePayroll}
              isLoading={togglingPayroll}
              variant={user.payrollEnabled ? 'outline' : 'default'}
              className="rounded-full px-5 h-auto py-2.5 text-[13px] font-bold shrink-0"
            >
              {user.payrollEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customers */}
        <div className="p-5 sm:p-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
            Customers
          </p>
          <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white mb-4">
            Recent customers
          </h3>
          <div className="space-y-2.5">
            {recentCustomers?.length > 0 ? (
              recentCustomers.map((customer) => (
                <div
                  key={customer._id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]"
                >
                  <div>
                    <p className="font-extrabold text-[13px] tracking-tight text-slate-900 dark:text-white capitalize">
                      {capitalize(customer.name)}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {customer.phone}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] ${
                      customer.status === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {customer.status}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Users}
                title="No Customers Yet"
                description="This business hasn't onboarded any customers to the platform."
                className="py-10"
              />
            )}
          </div>
        </div>

        {/* Recent Members */}
        <div className="p-5 sm:p-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
            Team
          </p>
          <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white mb-4">
            Recent members
          </h3>
          <div className="space-y-2.5">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-2xl" />
              ))
            ) : recentMembers?.length > 0 ? (
              recentMembers.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]"
                >
                  <div>
                    <p className="font-extrabold text-[13px] tracking-tight text-slate-900 dark:text-white capitalize">
                      {capitalize(member.name)}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {member.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] ${
                        (member.status || 'Active') === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {member.status || 'Active'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Users}
                title="No Members Yet"
                description="The platform operator hasn't added any team members yet."
                className="py-10"
              />
            )}
          </div>
        </div>

        {/* Recent Loans */}
        <div className="p-5 sm:p-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
            Lending
          </p>
          <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white mb-4">
            Recent loans
          </h3>
          <div className="space-y-2.5">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-2xl" />
              ))
            ) : recentLoans?.length > 0 ? (
              recentLoans.map((loan) => (
                <div
                  key={loan._id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]"
                >
                  <div>
                    <p className="font-extrabold text-[13px] tracking-tight text-slate-900 dark:text-white capitalize">
                      {capitalize(loan.customer?.name) || 'Unknown'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                      RS {loan.principal?.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] ${
                        loan.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : loan.status === 'completed'
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-rose-500/10 text-rose-600'
                      }`}
                    >
                      {loan.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={CreditCard}
                title="No Loans Found"
                description="This business hasn't generated any loan transactions yet."
                className="py-10"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
