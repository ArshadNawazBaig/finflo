import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Wallet,
  CalendarClock,
  CalendarPlus,
  Play,
  ArrowUpRight,
  Building2,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
import PillSelect from '@/components/ui/PillSelect';
import StatusBadge from '@/components/ui/StatusBadge';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import { formatCurrency, formatDate, capitalize } from '@/lib/utils';
import { toast } from 'sonner';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const PayrollDashboard = () => {
  const navigate = useNavigate();
  const now = new Date();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [runOpen, setRunOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/payroll/dashboard');
      setStats(data);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to load payroll dashboard',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRunPayroll = async () => {
    try {
      setRunning(true);
      const { data } = await api.post('/payroll/run', { month, year });
      toast.success('Payroll run ready');
      setRunOpen(false);
      navigate(`/payroll/runs/${data.run._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to run payroll');
    } finally {
      setRunning(false);
    }
  };

  const departments = stats?.departmentDistribution || [];
  const maxDeptCount = departments.reduce(
    (max, d) => Math.max(max, d.count || 0),
    0,
  );
  const lastRun = stats?.lastRun;

  const QUICK_ACTIONS = [
    {
      label: 'Run Payroll',
      description: 'Generate a monthly run',
      icon: <Play size={18} strokeWidth={2.5} />,
      iconBg: 'bg-primary/10 text-primary',
      onClick: () => setRunOpen(true),
    },
    {
      label: 'Employees',
      description: 'Manage your team',
      icon: <Users size={18} strokeWidth={2.5} />,
      iconBg: 'bg-blue-500/10 text-blue-500',
      onClick: () => navigate('/payroll/employees'),
    },
    {
      label: 'Leaves',
      description: 'Review leave requests',
      icon: <CalendarClock size={18} strokeWidth={2.5} />,
      iconBg: 'bg-amber-500/10 text-amber-500',
      onClick: () => navigate('/payroll/leaves'),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Payroll"
        description="Run payroll, track headcount, and stay ahead of pay dates."
        action={
          <Button
            onClick={() => setRunOpen(true)}
            className="rounded-full h-11 px-6 font-bold gap-2"
          >
            <Play size={14} strokeWidth={2.5} />
            Run Payroll
          </Button>
        }
      />

      {/* Stats */}
      {loading ? (
        <CardsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatsCard
            title="Total Employees"
            amount={stats?.totalEmployees ?? 0}
            subtitle="Active headcount"
            icon={<Users size={20} />}
            color="bg-blue-500 shadow-blue-500/20"
          />
          <StatsCard
            title="Est. Monthly Gross"
            amount={formatCurrency(stats?.estimatedMonthlyGross || 0)}
            subtitle="Projected payroll"
            icon={<Wallet size={20} />}
            color="bg-emerald-500 shadow-emerald-500/20"
            sensitive
          />
          <StatsCard
            title="Pending Leaves"
            amount={stats?.pendingLeaves ?? 0}
            subtitle="Awaiting review"
            icon={<CalendarClock size={20} />}
            color="bg-amber-500 shadow-amber-500/20"
          />
          <StatsCard
            title="Next Payroll Date"
            amount={
              stats?.nextPayrollDate ? formatDate(stats.nextPayrollDate) : '—'
            }
            subtitle="Upcoming run"
            icon={<CalendarPlus size={20} />}
            color="bg-primary shadow-primary/20"
          />
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="group flex items-center gap-3 rounded-[1.5rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] px-5 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-20px_rgba(15,23,42,0.18)]"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${action.iconBg}`}
            >
              {action.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-900 dark:text-white">
                {action.label}
              </span>
              <span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {action.description}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Department distribution */}
        <div className="xl:col-span-2 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
              Headcount
            </p>
            <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
              By department
            </h3>
          </div>
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-xl" />
              ))}
            </div>
          ) : departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500 gap-2">
              <Building2 size={26} className="opacity-40" />
              <p className="text-[11px] font-bold uppercase tracking-[0.15em]">
                No departments yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {departments.map((dept) => (
                <div key={dept.department}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 capitalize">
                      {capitalize(dept.department) || 'Unassigned'}
                    </span>
                    <span className="text-xs font-extrabold tabular-nums text-slate-900 dark:text-white">
                      {dept.count}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{
                        width: `${
                          maxDeptCount > 0
                            ? Math.max(6, (dept.count / maxDeptCount) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Last run */}
        <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5 sm:p-6 flex flex-col">
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
              History
            </p>
            <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
              Last run
            </h3>
          </div>
          {loading ? (
            <Skeleton className="h-28 w-full rounded-2xl" />
          ) : lastRun ? (
            <button
              type="button"
              onClick={() => navigate(`/payroll/runs/${lastRun._id}`)}
              className="group text-left rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4 transition-all hover:border-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {MONTHS[lastRun.month - 1]} {lastRun.year}
                </span>
                <StatusBadge status={lastRun.status} />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Net paid
                  </p>
                  <p className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(lastRun.totalNet || 0)}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                    {lastRun.employeeCount || 0} employees
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  View
                  <ArrowUpRight size={12} strokeWidth={2.5} />
                </span>
              </div>
            </button>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500 gap-2">
              <CalendarPlus size={26} className="opacity-40" />
              <p className="text-[11px] font-bold uppercase tracking-[0.15em]">
                No runs yet
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRunOpen(true)}
                className="rounded-full font-bold text-primary hover:text-primary"
              >
                Run your first payroll
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Run payroll dialog */}
      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Run Payroll</DialogTitle>
            <DialogDescription>
              Pick the period to generate a payroll run for.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Month
              </label>
              <PillSelect
                value={String(month)}
                onValueChange={(v) => setMonth(Number(v))}
                className="w-full"
                options={MONTHS.map((m, i) => ({
                  value: String(i + 1),
                  label: m,
                }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Year
              </label>
              <PillSelect
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
                className="w-full"
                options={Array.from({ length: 5 }, (_, i) => {
                  const y = now.getFullYear() - i;
                  return { value: String(y), label: String(y) };
                })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRunOpen(false)}
              className="rounded-full font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRunPayroll}
              isLoading={running}
              className="rounded-full font-bold gap-2"
            >
              {!running && <Play size={14} strokeWidth={2.5} />}
              Generate Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollDashboard;
