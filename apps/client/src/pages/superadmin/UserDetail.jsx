import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Mail,
  Calendar,
  CreditCard,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Edit,
  Save,
  X,
  Eye,
} from 'lucide-react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-border/50 shadow-sm relative overflow-hidden">
        {/* Decorative Background Icon */}
        <Users className="absolute -right-12 -top-12 w-64 h-64 opacity-[0.03] text-primary pointer-events-none" />

        <div className="flex items-center gap-6 relative z-10 transition-all duration-500">
          <button
            onClick={() => navigate(-1)}
            className="p-3 rounded-full hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground transition-all group shrink-0"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
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
                      className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                      Service Plan
                    </label>
                    <Select
                      value={formData.plan}
                      onValueChange={(value) =>
                        setFormData({ ...formData, plan: value })
                      }
                    >
                      <SelectTrigger className="w-full h-11 px-4 rounded-xl border border-border/50 bg-background text-sm font-bold">
                        <SelectValue placeholder="Select Plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Free">Free</SelectItem>
                        <SelectItem value="Basic">Basic</SelectItem>
                        <SelectItem value="Pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
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
                      <SelectTrigger className="w-full h-11 px-4 rounded-xl border border-border/50 bg-background text-sm font-bold">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h1 className="text-3xl font-black tracking-tighter">
                      {user.name}
                    </h1>
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
                  </div>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-muted-foreground">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="truncate max-w-[200px]">
                        {user.businessName || 'Independent Agent'}
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
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {!editing ? (
            <Button
              onClick={() => setEditing(true)}
              variant="gradient"
              className="px-8 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest"
            >
              <Edit size={14} /> Edit User
            </Button>
          ) : (
            <>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-full border border-border text-muted-foreground hover:bg-muted text-[11px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95"
              >
                <X size={14} /> Cancel
              </button>
              <Button
                onClick={handleSave}
                variant="success"
                className="px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest"
              >
                <Save size={14} /> Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loading
          ? [...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))
          : [
              {
                label: 'Customers',
                value: stats.customerCount,
                icon: Users,
                color: 'text-blue-500',
              },
              {
                label: 'Total Loans',
                value: stats.loanCount,
                icon: CreditCard,
                color: 'text-emerald-500',
              },
              {
                label: 'Active Loans',
                value: stats.activeLoanCount,
                icon: TrendingUp,
                color: 'text-orange-500',
              },
              {
                label: 'Members',
                value: stats.memberCount,
                icon: Users,
                color: 'text-purple-500',
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-card border border-border/50"
              >
                <div className="flex items-center gap-3 mb-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs font-bold text-muted-foreground uppercase">
                    {stat.label}
                  </span>
                </div>
                <p className="text-2xl font-black">{stat.value}</p>
              </div>
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
                    <p className="font-bold text-sm">{customer.name}</p>
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
              <p className="text-muted-foreground text-sm text-center py-4">
                No customers yet
              </p>
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
                    <p className="font-bold text-sm">{member.name}</p>
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
              <p className="text-muted-foreground text-sm text-center py-4">
                No members yet
              </p>
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
                    <p className="font-bold text-sm">
                      {loan.customer?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${loan.principalAmount?.toLocaleString()}
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
              <p className="text-muted-foreground text-sm text-center py-4">
                No loans yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
