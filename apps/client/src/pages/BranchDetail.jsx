import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Store,
  Receipt,
  History,
  Info,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Settings2,
  Power,
  PowerOff,
  MapPin,
  Phone,
  LayoutDashboard,
  Palette,
  ArrowLeft,
  UserCog,
  Users,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import api from '@/lib/axios';
import { toast } from 'sonner';

const BranchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [branch, setBranch] = useState(null);
  const [financials, setFinancials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingFinancials, setFetchingFinancials] = useState(false);
  const [staff, setStaff] = useState([]);
  const [isUpdatingManager, setIsUpdatingManager] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [expenseData, setExpenseData] = useState({
    amount: '',
    category: 'rent',
    description: '',
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchBranch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/branches/${id}`);
      setBranch(res.data);
    } catch (error) {
      console.error('Failed to fetch branch details', error);
      toast.error('Failed to load branch information');
      navigate('/branches');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchFinancials = useCallback(async () => {
    try {
      setFetchingFinancials(true);
      const { data } = await api.get(`/branches/${id}/financials`);
      setFinancials(data);
    } catch (error) {
      toast.error('Failed to fetch financials');
    } finally {
      setFetchingFinancials(false);
    }
  }, [id]);

  const fetchStaff = useCallback(async () => {
    try {
      const { data } = await api.get('/staff?limit=100'); // Get all staff
      setStaff(data.data || []);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  }, []);

  useEffect(() => {
    fetchBranch();
    fetchFinancials();
    fetchStaff();
  }, [fetchBranch, fetchFinancials, fetchStaff]);

  const toggleStatus = async () => {
    try {
      const newStatus = !branch.isActive;
      await api.put(`/branches/${id}`, {
        isActive: newStatus,
      });
      setBranch({ ...branch, isActive: newStatus });
      toast.success(
        `Branch ${newStatus ? 'activated' : 'deactivated'} successfully`,
      );
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleAddExpense = async () => {
    try {
      await api.post(`/branches/${id}/expenses`, expenseData);
      toast.success('Expense recorded successfully');
      setIsExpenseModalOpen(false);
      setExpenseData({ amount: '', category: 'rent', description: '' });
      fetchFinancials(); // Refresh financials
    } catch (error) {
      toast.error('Failed to record expense');
    } finally {
      setFetchingFinancials(false);
    }
  };

  const handleUpdateManager = async (managerId) => {
    try {
      setIsUpdatingManager(true);
      await api.put(`/branches/${id}`, { managerId });
      toast.success('Branch manager updated');
      fetchBranch();
    } catch (error) {
      toast.error('Failed to update branch manager');
    } finally {
      setIsUpdatingManager(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!branch) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <PageHeader
        title={branch.name}
        description={`Branch ID: ${id.slice(-6).toUpperCase()}`}
        onBack={() => navigate('/branches')}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-500 ${
              branch.isActive
                ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20'
                : 'bg-red-500/5 text-red-500 border-red-500/20'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full animate-pulse ${
                branch.isActive ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            {branch.isActive ? 'Operational' : 'Closed'}
          </span>
        </div>
      </PageHeader>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Total Transactions"
          amount={financials.length.toString()}
          icon={<History size={18} />}
          color="bg-primary text-primary border-primary/20"
          isGlass
        />
        <StatsCard
          title="Total Expenses"
          amount={`PKR ${financials
            .filter((f) => f.type === 'expense')
            .reduce((sum, f) => sum + f.amount, 0)
            .toLocaleString()}`}
          icon={<TrendingDown size={18} />}
          color="bg-red-500 text-red-600 border-red-500/20"
          isGlass
        />
        <StatsCard
          title="Manager"
          amount={branch.manager?.name || 'Unassigned'}
          icon={<LayoutDashboard size={18} />}
          color="bg-indigo-500 text-indigo-600 border-indigo-500/20"
          isGlass
        />
        <StatsCard
          title="Contact"
          amount={branch.contactNumber}
          icon={<Phone size={18} />}
          color="bg-emerald-500 text-emerald-600 border-emerald-500/20"
          isGlass
        />
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mt-4 sm:mt-8">
        <div className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 lg:w-72 no-scrollbar scrollbar-none snap-x mask-fade-right lg:mask-none">
          {[
            { id: 'overview', label: 'Overview', icon: <Info size={16} /> },
            {
              id: 'expenses',
              label: 'Operations & Expenses',
              icon: <Receipt size={16} />,
            },
            {
              id: 'ledger',
              label: 'Transaction Ledger',
              icon: <History size={16} />,
            },
            {
              id: 'settings',
              label: 'Branch Settings',
              icon: <Settings2 size={16} />,
              adminOnly: true,
            },
          ]
            .filter((tab) => !tab.adminOnly || !user.isManager)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-none lg:w-full flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-[1.5rem] text-xs sm:text-sm font-bold transition-all duration-500 snap-start whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]'
                    : 'bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground border border-transparent hover:border-border/50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
        </div>

        <div className="flex-1 lg:pl-4">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <Card className="rounded-[2.5rem] border-border/40 overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                  <div className="h-48 relative overflow-hidden">
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        background: `linear-gradient(135deg, ${branch.branding?.primaryColor || 'var(--primary)'} 0%, ${branch.branding?.secondaryColor || 'var(--primary-foreground)'} 100%)`,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      {branch.branding?.logoUrl ? (
                        <img
                          src={branch.branding.logoUrl}
                          alt="Logo"
                          className="h-24 object-contain"
                        />
                      ) : (
                        <Store size={80} className="text-primary opacity-20" />
                      )}
                    </div>
                  </div>
                  <CardContent className="p-10 space-y-8">
                    <div className="grid md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                            Branch Identity
                          </Label>
                          <h3 className="text-3xl font-black tracking-tight">
                            {branch.name}
                          </h3>
                          <p className="text-muted-foreground font-medium">
                            {branch.branding?.companyName ||
                              'Corporate Location'}
                          </p>
                        </div>
                        <div className="space-y-4 pt-4">
                          <div className="flex items-start gap-4 p-5 rounded-2xl bg-muted/30 border border-border/20">
                            <MapPin className="text-primary mt-1" size={20} />
                            <div>
                              <span className="text-sm font-black block mb-1">
                                Permanent Address
                              </span>
                              <span className="text-sm text-muted-foreground font-medium">
                                {branch.address}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 p-5 rounded-2xl bg-muted/30 border border-border/20">
                            <Phone className="text-primary" size={20} />
                            <div>
                              <span className="text-sm font-black block mb-1">
                                Direct Contact
                              </span>
                              <span className="text-sm text-muted-foreground font-medium">
                                {branch.contactNumber}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-primary/[0.03] border border-primary/10 rounded-[2.5rem] p-8 flex flex-col justify-center text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary">
                          <TrendingUp size={40} />
                        </div>
                        <h4 className="text-xl font-black mb-2">
                          Operational Analytics
                        </h4>
                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                          This branch contributes to 12% of the total ecosystem
                          volume. Regular auditing recommended every 30 days.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'expenses' && (
              <motion.div
                key="expenses"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between px-4">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">
                      Expense Logs
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">
                      Capture operational disbursement events.
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="rounded-full shadow-2xl shadow-primary/30 font-black uppercase tracking-widest text-[10px] h-12 px-8"
                  >
                    <Plus size={18} className="mr-2" /> Log Expense
                  </Button>
                </div>

                <div className="grid gap-4">
                  {financials.filter((f) => f.type === 'expense').length ===
                  0 ? (
                    <div className="py-24 text-center bg-muted/10 rounded-[3rem] border-2 border-dashed border-border/50">
                      <Receipt
                        size={64}
                        className="mx-auto text-muted-foreground/20 mb-6"
                      />
                      <p className="text-sm font-black text-muted-foreground/40 uppercase tracking-widest">
                        No recorded disbursements
                      </p>
                    </div>
                  ) : (
                    financials
                      .filter((f) => f.type === 'expense')
                      .map((expense, idx) => (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          key={expense._id}
                          className="p-6 rounded-[2rem] bg-card border border-border/40 flex items-center justify-between group hover:border-red-500/30 transition-all duration-500"
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-inner group-hover:scale-110 transition-transform">
                              <TrendingDown size={28} />
                            </div>
                            <div>
                              <span className="text-lg font-black block tracking-tight leading-none mb-2 uppercase italic">
                                {expense.description || expense.category}
                              </span>
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant="subtle"
                                  className="text-[9px] font-black uppercase bg-red-500/5 text-red-600 border-none px-2"
                                >
                                  {expense.category}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                                  {new Date(expense.date).toLocaleDateString(
                                    'en-US',
                                    {
                                      month: 'long',
                                      day: 'numeric',
                                      year: 'numeric',
                                    },
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-black text-red-600 tracking-tighter">
                              -PKR {expense.amount.toLocaleString()}
                            </span>
                          </div>
                        </motion.div>
                      ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'ledger' && (
              <motion.div
                key="ledger"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="px-4">
                  <h3 className="text-2xl font-black tracking-tight">
                    Financial Ledger
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    Complete audit trail of capital flow.
                  </p>
                </div>

                <div className="grid gap-4">
                  {financials.length === 0 ? (
                    <div className="py-24 text-center bg-muted/10 rounded-[3rem] border-2 border-dashed border-border/50">
                      <History
                        size={64}
                        className="mx-auto text-muted-foreground/20 mb-6"
                      />
                      <p className="text-sm font-black text-muted-foreground/40 uppercase tracking-widest">
                        Zero historical entries
                      </p>
                    </div>
                  ) : (
                    financials.map((transaction, idx) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={transaction._id}
                        className="p-6 rounded-[2rem] bg-card border border-border/40 flex items-center justify-between group hover:border-primary/30 transition-all duration-500"
                      >
                        <div className="flex items-center gap-6">
                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all duration-500 group-hover:-translate-y-1 ${transaction.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}
                          >
                            {transaction.type === 'income' ? (
                              <TrendingUp size={28} />
                            ) : (
                              <TrendingDown size={28} />
                            )}
                          </div>
                          <div>
                            <span className="text-lg font-black block tracking-tight leading-none mb-2 uppercase">
                              {transaction.description ||
                                transaction.customer?.name ||
                                'Authorized Operation'}
                            </span>
                            <div className="flex items-center gap-3">
                              <Badge
                                variant="subtle"
                                className={`text-[9px] font-black uppercase border-none px-2 ${transaction.type === 'income' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}
                              >
                                {transaction.category}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60 font-mono">
                                {new Date(
                                  transaction.date,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-2xl font-black tracking-tighter ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}
                          >
                            {transaction.type === 'income' ? '+' : '-'}PKR{' '}
                            {transaction.amount.toLocaleString()}
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="px-4">
                  <h3 className="text-2xl font-black tracking-tight">
                    System Controls
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    Manage branch lifecycle and visibility.
                  </p>
                </div>

                <div className="p-10 rounded-[3rem] bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-border/40 space-y-10">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <span className="text-xl font-black block tracking-tight">
                        Branch Availability
                      </span>
                      <p className="text-sm text-muted-foreground font-medium max-w-sm leading-relaxed">
                        {branch.isActive
                          ? 'The branch is currently open for operations. Deactivating will pause all transactions and visibility.'
                          : 'This branch is closed. Activating will resume operational capabilities and customer service.'}
                      </p>
                    </div>
                    <Button
                      variant={branch.isActive ? 'destructive' : 'default'}
                      onClick={toggleStatus}
                      className="rounded-full px-10 h-14 font-black uppercase tracking-widest text-[11px] shadow-xl transition-all active:scale-95"
                    >
                      {branch.isActive ? (
                        <>
                          <PowerOff size={18} className="mr-3" /> Deactivate
                          Branch
                        </>
                      ) : (
                        <>
                          <Power size={18} className="mr-3" /> Activate Branch
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="pt-10 border-t border-border/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <UserCog size={24} className="text-primary" />
                          <span className="text-xl font-black block tracking-tight leading-none">
                            Branch Manager
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium max-w-sm leading-relaxed">
                          Assign a specific staff member to oversee this
                          branch's daily activities.
                        </p>
                      </div>

                      <div className="w-full sm:w-72 space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                          Select Designated Manager
                        </Label>
                        <Select
                          disabled={isUpdatingManager}
                          value={branch.manager?._id || 'none'}
                          onValueChange={(val) =>
                            handleUpdateManager(val === 'none' ? null : val)
                          }
                        >
                          <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-border/40 font-bold text-sm">
                            <SelectValue placeholder="Select Manager" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-border/40">
                            <SelectItem value="none" className="rounded-xl">
                              No Manager Assigned
                            </SelectItem>
                            {staff.map((member) => (
                              <SelectItem
                                key={member._id}
                                value={member._id}
                                className="rounded-xl"
                              >
                                <div className="flex flex-col py-1">
                                  <span className="font-bold text-sm">
                                    {member.name}
                                  </span>
                                  <span className="text-[10px] uppercase text-muted-foreground tracking-widest font-black">
                                    {member.email}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-border/20 flex items-center justify-between opacity-50 cursor-not-allowed">
                    <div className="space-y-2">
                      <span className="text-xl font-black block tracking-tight">
                        Branding & Profiles
                      </span>
                      <p className="text-sm text-muted-foreground font-medium">
                        This feature is managed by the Corporate Headquarters.
                      </p>
                    </div>
                    <div className="w-14 h-14 bg-muted/50 rounded-2xl flex items-center justify-center">
                      <Palette size={24} className="text-muted-foreground/30" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Record Expense Modal */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="sm:max-w-[480px] w-[95vw] rounded-[1.5rem] sm:rounded-[2.5rem] !p-0 border-none shadow-2xl z-[610] overflow-hidden flex flex-col gap-0 bg-card border border-border/20">
          <div className="bg-gradient-to-br from-red-600 to-rose-700 p-6 sm:p-10 text-white relative shrink-0">
            <div className="absolute top-0 right-0 p-6 sm:p-10 opacity-10">
              <Receipt size={64} className="sm:w-20 sm:h-20" />
            </div>
            <DialogHeader className="relative z-10 text-left items-start">
              <DialogTitle className="text-2xl sm:text-4xl font-black tracking-tighter leading-none mb-2">
                Record Outflow
              </DialogTitle>
              <DialogDescription className="text-white/70 font-black uppercase tracking-[0.2em] text-[8px] sm:text-[10px]">
                Operational Disbursement Authorization
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[calc(85vh-200px)] custom-scrollbar">
            <div className="p-6 sm:p-10 space-y-8 sm:space-y-10">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                  Capital Amount (PKR)
                </Label>
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-muted-foreground/30 group-focus-within:text-red-500 transition-colors text-lg">
                    PKR
                  </span>
                  <Input
                    type="number"
                    value={expenseData.amount}
                    onChange={(e) =>
                      setExpenseData({ ...expenseData, amount: e.target.value })
                    }
                    placeholder="0.00"
                    className="pl-20 h-16 sm:h-20 rounded-2xl border-border/40 focus-visible:ring-red-500/20 focus-visible:border-red-500 bg-muted/30 font-black text-2xl sm:text-4xl tracking-tighter transition-all"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                  Classification Pool
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'rent',
                    'salary',
                    'utilities',
                    'marketing',
                    'maintenance',
                    'other',
                  ].map((cat) => (
                    <button
                      key={cat}
                      onClick={() =>
                        setExpenseData({ ...expenseData, category: cat })
                      }
                      className={`h-12 sm:h-14 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest border-2 transition-all duration-500 flex items-center justify-center ${expenseData.category === cat ? 'bg-red-500 text-white border-red-500 shadow-xl shadow-red-500/20 scale-[1.03]' : 'bg-transparent border-border/40 text-muted-foreground/60 hover:border-red-500/30 hover:text-red-500'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                  Operational Context
                </Label>
                <Input
                  value={expenseData.description}
                  onChange={(e) =>
                    setExpenseData({
                      ...expenseData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Brief justification for audit..."
                  className="h-14 sm:h-16 rounded-2xl border-border/40 bg-muted/40 font-bold text-sm sm:text-base tracking-tight px-6"
                />
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-10 pb-6 sm:pb-8 shrink-0 mt-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setIsExpenseModalOpen(false)}
                className="flex-1 rounded-xl h-12 font-black uppercase text-[10px] tracking-widest border-border/40 hover:bg-muted/50 order-2 sm:order-1 transition-all"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddExpense}
                className="flex-[1.5] rounded-xl h-12 font-black uppercase tracking-[0.2em] text-[10px] bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 transform transition-all active:scale-95 order-1 sm:order-2"
              >
                Authorize
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BranchDetail;
