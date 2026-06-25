import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  BadgeCheck,
  Wallet,
  Users,
  CircleDollarSign,
  MinusCircle,
  Receipt,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import PillSelect from '@/components/ui/PillSelect';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/ui/Pagination';
import PayslipPDFPreview from '@/components/payroll/PayslipPDFPreview';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
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
import { formatCurrency, capitalize } from '@/lib/utils';
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

const PAYMENT_METHODS = [
  { value: 'bank', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
];

const PayrollRunDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [run, setRun] = useState(null);
  const [payslips, setPayslips] = useState({
    data: [],
    totalEntries: 0,
    totalPages: 0,
    currentPage: 1,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [approving, setApproving] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('bank');

  const fetchRun = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/payroll/runs/${id}`, {
        params: { page, limit },
      });
      setRun(data.run);
      setPayslips(
        data.payslips || {
          data: [],
          totalEntries: 0,
          totalPages: 0,
          currentPage: 1,
        },
      );
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Payroll run not found');
        navigate('/payroll/runs');
        return;
      }
      toast.error(error.response?.data?.message || 'Failed to load pay run');
    } finally {
      setLoading(false);
    }
  }, [id, page, limit, navigate]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  const handleApprove = async () => {
    try {
      setApproving(true);
      await api.post(`/payroll/runs/${id}/approve`);
      toast.success('Payroll run approved');
      setApproveOpen(false);
      fetchRun();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve run');
    } finally {
      setApproving(false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      setPaying(true);
      await api.post(`/payroll/runs/${id}/mark-paid`, { paymentMethod });
      toast.success('Payroll marked as paid');
      setPayOpen(false);
      fetchRun();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark as paid');
    } finally {
      setPaying(false);
    }
  };

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row) => (
        <div className="min-w-0">
          <p className="font-bold text-slate-900 dark:text-white truncate capitalize">
            {capitalize(row.employee?.name) || 'Unknown'}
          </p>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
            {row.employee?.employeeId}
            {row.employee?.department ? ` · ${row.employee.department}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'gross',
      header: 'Gross',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums font-semibold">
          {formatCurrency(row.gross || 0)}
        </span>
      ),
    },
    {
      key: 'totalDeductions',
      header: 'Deductions',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums text-rose-500 dark:text-rose-400">
          -{formatCurrency(row.totalDeductions || 0)}
        </span>
      ),
    },
    {
      key: 'netPay',
      header: 'Net Pay',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums font-extrabold text-slate-900 dark:text-white">
          {formatCurrency(row.netPay || 0)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <PayslipPDFPreview
          payslipId={row._id}
          variant="ghost"
          size="sm"
          className="rounded-full text-xs font-bold"
        />
      ),
    },
  ];

  if (loading && !run) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-[2rem]" />
        <Skeleton className="h-64 w-full rounded-[2rem]" />
      </div>
    );
  }

  if (!run) return null;

  const SUMMARY = [
    {
      label: 'Gross',
      value: formatCurrency(run.totalGross || 0),
      icon: <CircleDollarSign size={16} />,
      tint: 'bg-blue-500/10 text-blue-500',
    },
    {
      label: 'Deductions',
      value: formatCurrency(run.totalDeductions || 0),
      icon: <MinusCircle size={16} />,
      tint: 'bg-rose-500/10 text-rose-500',
    },
    {
      label: 'Net',
      value: formatCurrency(run.totalNet || 0),
      icon: <Wallet size={16} />,
      tint: 'bg-emerald-500/10 text-emerald-500',
    },
    {
      label: 'Employees',
      value: run.employeeCount ?? 0,
      icon: <Users size={16} />,
      tint: 'bg-primary/10 text-primary',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={`${MONTHS[run.month - 1]} ${run.year}`}
        eyebrow="Pay run"
        description="Review payslips and advance this run through approval."
        onBack={() => navigate('/payroll/runs')}
        badge={<StatusBadge status={run.status} />}
        action={
          run.status === 'draft' ? (
            <Button
              onClick={() => setApproveOpen(true)}
              isLoading={approving}
              className="rounded-full h-11 px-6 font-bold gap-2"
            >
              {!approving && <BadgeCheck size={15} strokeWidth={2.5} />}
              Approve Run
            </Button>
          ) : run.status === 'approved' ? (
            <Button
              onClick={() => setPayOpen(true)}
              variant="success"
              className="rounded-full h-11 px-6 font-bold gap-2 text-white"
            >
              <Wallet size={15} strokeWidth={2.5} />
              Mark Paid
            </Button>
          ) : run.status === 'paid' ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-5 py-2.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={16} strokeWidth={2.5} />
              Paid
            </span>
          ) : null
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SUMMARY.map((item) => (
          <div
            key={item.label}
            className="rounded-[1.5rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                {item.label}
              </p>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${item.tint}`}
              >
                {item.icon}
              </span>
            </div>
            <p className="text-xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Payslips */}
      <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
            Payslips
          </p>
          <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
            {payslips.totalEntries} employee
            {payslips.totalEntries === 1 ? '' : 's'}
          </h3>
        </div>
        <DataTable
          columns={columns}
          data={payslips.data}
          loading={loading}
          emptyState={{
            icon: Receipt,
            title: 'No payslips',
            description: 'This run has no payslips yet.',
          }}
        />
        {!loading && payslips.data.length > 0 && (
          <Pagination
            currentPage={payslips.currentPage || page}
            totalPages={payslips.totalPages}
            totalEntries={payslips.totalEntries}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* Approve confirm */}
      <ConfirmActionModal
        isOpen={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApprove}
        loading={approving}
        variant="info"
        title="Approve this payroll run?"
        description="Approving locks the run's payslips. You can then mark it paid to disburse net pay and settle any linked loan EMIs."
        confirmText="Approve Run"
      />

      {/* Mark paid dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Mark Payroll Paid</DialogTitle>
            <DialogDescription>
              Confirm the payment method to settle{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {formatCurrency(run.totalNet || 0)}
              </span>{' '}
              across {run.employeeCount ?? 0} employee
              {run.employeeCount === 1 ? '' : 's'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Payment method
            </label>
            <PillSelect
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              icon={<Wallet size={14} />}
              options={PAYMENT_METHODS}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPayOpen(false)}
              className="rounded-full font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkPaid}
              isLoading={paying}
              variant="success"
              className="rounded-full font-bold gap-2 text-white"
            >
              {!paying && <CheckCircle2 size={15} strokeWidth={2.5} />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollRunDetail;
