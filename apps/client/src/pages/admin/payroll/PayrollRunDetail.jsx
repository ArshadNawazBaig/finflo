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
  Pencil,
  AlertTriangle,
  MinusSquare,
  Plus,
  X,
  RefreshCw,
  Undo2,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import PillSelect from '@/components/ui/PillSelect';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/ui/Pagination';
import PayslipPDFPreview from '@/components/payroll/PayslipPDFPreview';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import FormField from '@/components/ui/FormField';
import { Input } from '@/components/ui/input';
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
  const [variablePending, setVariablePending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [approving, setApproving] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('bank');
  const [regenerating, setRegenerating] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopening, setReopening] = useState(false);

  // Variable/freelance amount entry
  const [amountSlip, setAmountSlip] = useState(null); // the payslip being edited
  const [amountForm, setAmountForm] = useState({ amount: '', units: '' });
  const [savingAmount, setSavingAmount] = useState(false);

  // Ad-hoc deductions entry
  const [deductSlip, setDeductSlip] = useState(null); // the payslip being edited
  const [deductRows, setDeductRows] = useState([]); // [{ label, amount }]
  const [savingDeduct, setSavingDeduct] = useState(false);

  const fetchRun = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/payroll/runs/${id}`, {
        params: { page, limit },
      });
      setRun(data.run);
      setVariablePending(data.variablePending || 0);
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

  const handleRegenerate = async () => {
    if (!run) return;
    try {
      setRegenerating(true);
      const { data } = await api.post('/payroll/run', {
        month: run.month,
        year: run.year,
      });
      toast.success(
        `Run updated — ${data.payslipCount} employee${data.payslipCount === 1 ? '' : 's'}`,
      );
      fetchRun();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to regenerate run');
    } finally {
      setRegenerating(false);
    }
  };

  const handleReopen = async () => {
    try {
      setReopening(true);
      await api.post(`/payroll/runs/${id}/reopen`);
      toast.success('Run reopened to draft');
      setReopenOpen(false);
      fetchRun();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reopen run');
    } finally {
      setReopening(false);
    }
  };

  const openAmountModal = (row) => {
    setAmountForm({
      amount: row.amountFinalized ? String(row.gross ?? '') : '',
      units: row.units ? String(row.units) : '',
    });
    setAmountSlip(row);
  };

  const handleSaveAmount = async () => {
    if (!amountSlip) return;
    const amount = Number(amountForm.amount);
    if (amountForm.amount === '' || Number.isNaN(amount) || amount < 0) {
      toast.error('Enter a valid pay amount (0 or more)');
      return;
    }
    try {
      setSavingAmount(true);
      await api.put(`/payroll/runs/${id}/payslips/${amountSlip._id}`, {
        amount,
        units: amountForm.units === '' ? 0 : Number(amountForm.units),
      });
      toast.success('Pay amount saved');
      setAmountSlip(null);
      fetchRun();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save amount');
    } finally {
      setSavingAmount(false);
    }
  };

  const openDeductModal = (row) => {
    const existing = (row.deductions?.customDeductions || []).map((d) => ({
      label: d.label || '',
      amount: d.amount != null ? String(d.amount) : '',
    }));
    setDeductRows(existing.length ? existing : [{ label: '', amount: '' }]);
    setDeductSlip(row);
  };

  const addDeductRow = () =>
    setDeductRows((rows) => [...rows, { label: '', amount: '' }]);
  const updateDeductRow = (idx, key, value) =>
    setDeductRows((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
    );
  const removeDeductRow = (idx) =>
    setDeductRows((rows) => rows.filter((_, i) => i !== idx));

  const deductTotal = deductRows.reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0,
  );

  const handleSaveDeductions = async () => {
    if (!deductSlip) return;
    const deductions = deductRows
      .map((r) => ({
        label: r.label.trim(),
        amount: Number(r.amount) || 0,
      }))
      .filter((r) => r.amount > 0);
    if (deductions.some((r) => !r.label)) {
      toast.error('Give every deduction a label');
      return;
    }
    try {
      setSavingDeduct(true);
      await api.put(
        `/payroll/runs/${id}/payslips/${deductSlip._id}/deductions`,
        { deductions },
      );
      toast.success('Deductions saved');
      setDeductSlip(null);
      fetchRun();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save deductions');
    } finally {
      setSavingDeduct(false);
    }
  };

  const isDraft = run?.status === 'draft';

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-900 dark:text-white truncate capitalize">
              {capitalize(row.employee?.name) || 'Unknown'}
            </p>
            {row.isVariable && (
              <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                Freelance
              </span>
            )}
          </div>
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
      render: (row) =>
        row.isVariable && !row.amountFinalized ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Amount required
          </span>
        ) : (
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
        <div className="flex items-center justify-end gap-1.5">
          {isDraft && row.isVariable && (
            <Button
              variant={row.amountFinalized ? 'ghost' : 'outline'}
              size="sm"
              onClick={() => openAmountModal(row)}
              className="rounded-full text-xs font-bold"
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              {row.amountFinalized ? 'Edit' : 'Set amount'}
            </Button>
          )}
          {isDraft && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDeductModal(row)}
              className="rounded-full text-xs font-bold"
            >
              <MinusSquare className="mr-1 h-3.5 w-3.5" />
              Deductions
              {(row.deductions?.customDeductions || []).length > 0 && (
                <span className="ml-1.5 rounded-full bg-rose-500/15 px-1.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                  {row.deductions.customDeductions.length}
                </span>
              )}
            </Button>
          )}
          <PayslipPDFPreview
            payslipId={row._id}
            variant="ghost"
            size="sm"
            className="rounded-full text-xs font-bold"
          />
        </div>
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
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            {isDraft && (
              <Button
                variant="outline"
                onClick={handleRegenerate}
                isLoading={regenerating}
                title="Refresh payslips to include newly added or removed employees"
                className="rounded-full h-11 px-5 font-bold gap-2"
              >
                {!regenerating && <RefreshCw size={15} strokeWidth={2.5} />}
                Regenerate
              </Button>
            )}
            {isDraft ? (
              <Button
                onClick={() => setApproveOpen(true)}
                isLoading={approving}
                disabled={variablePending > 0}
                title={
                  variablePending > 0
                    ? 'Enter all freelance pay amounts first'
                    : undefined
                }
                className="rounded-full h-11 px-6 font-bold gap-2"
              >
                {!approving && <BadgeCheck size={15} strokeWidth={2.5} />}
                Approve Run
              </Button>
            ) : run.status === 'approved' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setReopenOpen(true)}
                  className="rounded-full h-11 px-5 font-bold gap-2"
                >
                  <Undo2 size={15} strokeWidth={2.5} />
                  Reopen
                </Button>
                <Button
                  onClick={() => setPayOpen(true)}
                  variant="success"
                  className="rounded-full h-11 px-6 font-bold gap-2 text-white"
                >
                  <Wallet size={15} strokeWidth={2.5} />
                  Mark Paid
                </Button>
              </>
            ) : run.status === 'paid' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setReopenOpen(true)}
                  className="rounded-full h-11 px-5 font-bold gap-2"
                >
                  <Undo2 size={15} strokeWidth={2.5} />
                  Reopen
                </Button>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-5 py-2.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                  Paid
                </span>
              </>
            ) : null}
          </div>
        }
      />

      {/* Freelance amounts pending */}
      {isDraft && variablePending > 0 && (
        <div className="flex items-start gap-3 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.08]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={16} />
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-bold text-amber-800 dark:text-amber-300">
              {variablePending} freelance pay amount
              {variablePending === 1 ? '' : 's'} pending
            </p>
            <p className="text-amber-700/80 dark:text-amber-300/70">
              Set each freelancer’s pay for this month before approving the run.
            </p>
          </div>
        </div>
      )}

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

      {/* Reopen confirm */}
      <ConfirmActionModal
        isOpen={reopenOpen}
        onClose={() => setReopenOpen(false)}
        onConfirm={handleReopen}
        loading={reopening}
        variant="danger"
        title={`Reopen ${MONTHS[run.month - 1]} ${run.year} to draft?`}
        description={
          run.status === 'paid'
            ? 'This reverses the recorded salary disbursement for this run and unlocks it so you can add or update employees, then regenerate and pay again. Runs that already settled a loan EMI cannot be reopened.'
            : 'This unlocks the run so you can add or update employees and regenerate it. You will need to approve it again afterwards.'
        }
        confirmText="Reopen Run"
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

      {/* Set / edit freelance pay amount */}
      <Dialog open={!!amountSlip} onOpenChange={(open) => !open && setAmountSlip(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Set freelance pay</DialogTitle>
            <DialogDescription>
              Enter the gross pay for{' '}
              <span className="font-bold capitalize text-slate-900 dark:text-white">
                {capitalize(amountSlip?.employee?.name) || 'this employee'}
              </span>{' '}
              for {MONTHS[(run.month || 1) - 1]} {run.year}. Tax and any linked
              loan EMI are recalculated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Pay Amount" htmlFor="amt-amount" required>
              <Input
                id="amt-amount"
                type="number"
                min="0"
                value={amountForm.amount}
                onChange={(e) =>
                  setAmountForm((p) => ({ ...p, amount: e.target.value }))
                }
                placeholder="0"
                autoFocus
              />
            </FormField>
            <FormField
              label="Units"
              htmlFor="amt-units"
              hint={`Optional — ${amountSlip?.employee?.payRateUnit || 'hour'}s / tasks worked`}
            >
              <Input
                id="amt-units"
                type="number"
                min="0"
                value={amountForm.units}
                onChange={(e) =>
                  setAmountForm((p) => ({ ...p, units: e.target.value }))
                }
                placeholder="0"
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAmountSlip(null)}
              className="rounded-full font-semibold"
              disabled={savingAmount}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAmount}
              isLoading={savingAmount}
              className="rounded-full font-bold"
            >
              Save Amount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / edit ad-hoc deductions */}
      <Dialog open={!!deductSlip} onOpenChange={(open) => !open && setDeductSlip(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Deductions</DialogTitle>
            <DialogDescription>
              Add ad-hoc deductions (advance recovery, fines, damages…) for{' '}
              <span className="font-bold capitalize text-slate-900 dark:text-white">
                {capitalize(deductSlip?.employee?.name) || 'this employee'}
              </span>
              . These apply on top of tax, EOBI and any loan EMI.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5">
            {deductRows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={row.label}
                  onChange={(e) => updateDeductRow(idx, 'label', e.target.value)}
                  placeholder="Reason (e.g. Salary advance)"
                  className="flex-1"
                />
                <Input
                  type="number"
                  min="0"
                  value={row.amount}
                  onChange={(e) => updateDeductRow(idx, 'amount', e.target.value)}
                  placeholder="Amount"
                  className="w-32"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDeductRow(idx)}
                  className="shrink-0 text-rose-500 hover:text-rose-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDeductRow}
              className="rounded-full font-bold"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add deduction
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/[0.03]">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Total deductions
            </span>
            <span className="tabular-nums text-base font-extrabold text-rose-600 dark:text-rose-400">
              {formatCurrency(deductTotal)}
            </span>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeductSlip(null)}
              className="rounded-full font-semibold"
              disabled={savingDeduct}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDeductions}
              isLoading={savingDeduct}
              className="rounded-full font-bold"
            >
              Save Deductions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollRunDetail;
