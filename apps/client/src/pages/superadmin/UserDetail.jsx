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
} from 'lucide-react';
import api from '@/lib/axios';
import { capitalize, cn } from '@/lib/utils';

import { Skeleton } from '@/components/ui/skeleton';
import { ProfilePageSkeleton } from '@/components/ui/PageSkeletons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import StatsCard from '@/components/StatsCard';
import EmptyState from '@/components/ui/EmptyState';

const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

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
      await api.put(`/super-admin/users/${id}`, formData);
      toast.success('User updated successfully');
      setEditing(false);
      // Refresh data
      const { data: refreshed } = await api.get(`/super-admin/users/${id}`);
      setData(refreshed);
    } catch (error) {
      toast.error('Failed to update user');
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
      <PageHeader
        variant="card"
        icon={Users}
        onBack={() => navigate(-1)}
        title={
          editing ? 'Edit Business' : capitalize(user.name) || 'User Profile'
        }
        badge={
          !editing && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                  user.plan === 'Pro'
                    ? 'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-lg shadow-primary/20'
                    : 'bg-primary/10 text-primary border border-primary/20',
                )}
              >
                {user.plan}
              </span>
              <span
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                  user.isActive
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-500 border border-red-500/20',
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
          )
        }
        description={
          !editing ? (
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-muted-foreground">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="truncate max-w-[200px]">
                  {capitalize(user.businessName) || 'Independent Agent'}
                </span>
              </div>
              <div className="hidden sm:block w-1.5 h-1.5 bg-border rounded-full" />
              <div className="flex items-center gap-2 text-sm font-medium">
                <Mail className="w-4 h-4 text-primary" />
                <span>{user.email}</span>
              </div>
              <div className="hidden sm:block w-1.5 h-1.5 bg-border rounded-full" />
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="w-4 h-4 text-primary" />
                <span>
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm font-medium text-muted-foreground">
              Modify business details, plan settings, and account status.
            </p>
          )
        }
      >
        <div className="flex items-center gap-2 justify-end">
          {!editing ? (
            <Button
              onClick={() => setEditing(true)}
              variant="gradient"
              className="px-8 h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-2"
            >
              <Edit size={16} /> Edit Profile
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setEditing(false)}
                variant="outline"
                className="h-12 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest border-border/50"
              >
                <X size={16} className="mr-2" /> Cancel
              </Button>
              <Button
                onClick={handleSave}
                variant="gradient"
                className="h-12 px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-2"
              >
                <Save size={16} /> Save Changes
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      {editing && (
        <div className="p-8 rounded-[2.5rem] bg-card border border-border/50 shadow-sm animate-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-5 h-12 rounded-2xl border border-border/50 bg-background text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">
                Business Name
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    businessName: e.target.value,
                  })
                }
                className="w-full px-5 h-12 rounded-2xl border border-border/50 bg-background text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">
                Service Plan
              </label>
              <Select
                value={formData.plan}
                onValueChange={(value) =>
                  setFormData({ ...formData, plan: value })
                }
              >
                <SelectTrigger className="w-full h-12 px-5 rounded-2xl border border-border/50 bg-background text-sm font-bold">
                  <SelectValue placeholder="Select Plan" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  <SelectItem value="Free">Free</SelectItem>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">
                Account Status
              </label>
              <Select
                value={formData.isActive ? 'active' : 'inactive'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    isActive: value === 'active',
                  })
                }
              >
                <SelectTrigger className="w-full h-12 px-5 rounded-2xl border border-border/50 bg-background text-sm font-bold">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customers */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <h3 className="font-black mb-4">Recent Customers</h3>
          <div className="space-y-3">
            {recentCustomers?.length > 0 ? (
              recentCustomers.map((customer) => (
                <div
                  key={customer._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
                >
                  <div>
                    <p className="font-bold text-sm capitalize">
                      {customer.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {customer.phone}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      customer.status === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-muted text-muted-foreground'
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
                className="py-12"
              />
            )}
          </div>
        </div>

        {/* Recent Members */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <h3 className="font-black mb-4">Recent Members</h3>
          <div className="space-y-3">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))
            ) : recentMembers?.length > 0 ? (
              recentMembers.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
                >
                  <div>
                    <p className="font-bold text-sm capitalize">
                      {member.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        (member.status || 'Active') === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-muted text-muted-foreground border border-border/50'
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
                className="py-12"
              />
            )}
          </div>
        </div>

        {/* Recent Loans */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <h3 className="font-black mb-4">Recent Loans</h3>
          <div className="space-y-3">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))
            ) : recentLoans?.length > 0 ? (
              recentLoans.map((loan) => (
                <div
                  key={loan._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
                >
                  <div>
                    <p className="font-bold text-sm capitalize">
                      {loan.customer?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      RS {loan.principal?.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        loan.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : loan.status === 'completed'
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-red-500/10 text-red-600'
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
                className="py-12"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
