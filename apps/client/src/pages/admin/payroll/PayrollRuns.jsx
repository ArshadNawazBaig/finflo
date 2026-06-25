import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, CalendarRange, ListFilter } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import PillSelect from '@/components/ui/PillSelect';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/ui/Pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
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

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PayrollRuns = () => {
  const navigate = useNavigate();
  const now = new Date();

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [runOpen, setRunOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/payroll/runs', {
        params: {
          page,
          limit,
          ...(status !== 'all' ? { status } : {}),
        },
      });
      setRuns(data.data || []);
      setTotalEntries(data.totalEntries || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load pay runs');
    } finally {
      setLoading(false);
    }
  }, [page, limit, status]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

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

  const columns = [
    {
      key: 'period',
      header: 'Period',
      render: (row) => (
        <span className="font-bold text-slate-900 dark:text-white">
          {MONTHS[row.month - 1]} {row.year}
        </span>
      ),
    },
    {
      key: 'employeeCount',
      header: 'Employees',
      render: (row) => (
        <span className="tabular-nums">{row.employeeCount ?? 0}</span>
      ),
    },
    {
      key: 'totalGross',
      header: 'Gross',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums font-semibold">
          {formatCurrency(row.totalGross || 0)}
        </span>
      ),
    },
    {
      key: 'totalNet',
      header: 'Net',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums font-extrabold text-slate-900 dark:text-white">
          {formatCurrency(row.totalNet || 0)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Pay Runs"
        description="Every payroll run, from draft to paid."
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-white/[0.02] p-4 rounded-[2rem] border border-slate-100 dark:border-white/[0.06]">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 px-1">
          {totalEntries} run{totalEntries === 1 ? '' : 's'}
        </p>
        <PillSelect
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          icon={<ListFilter size={14} />}
          options={STATUS_OPTIONS}
          className="w-full sm:w-52"
        />
      </div>

      <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
        <DataTable
          columns={columns}
          data={runs}
          loading={loading}
          onRowClick={(row) => navigate(`/payroll/runs/${row._id}`)}
          emptyState={{
            icon: CalendarRange,
            title: 'No pay runs yet',
            description:
              status === 'all'
                ? 'Run payroll to generate your first pay run.'
                : 'No runs match this status filter.',
            action: (
              <Button
                onClick={() => setRunOpen(true)}
                className="rounded-full font-bold gap-2"
              >
                <Play size={14} strokeWidth={2.5} />
                Run Payroll
              </Button>
            ),
          }}
        />
        {!loading && runs.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalEntries={totalEntries}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        )}
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

export default PayrollRuns;
