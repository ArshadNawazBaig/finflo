import { useState, useEffect, useCallback } from 'react';
import { Plus, CalendarOff, Check, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import PillSelect from '@/components/ui/PillSelect';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/ui/Pagination';
import FormField from '@/components/ui/FormField';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatDate, capitalize } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const TYPE_OPTIONS = [
  { value: 'annual', label: 'Annual' },
  { value: 'sick', label: 'Sick' },
  { value: 'casual', label: 'Casual' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'paternity', label: 'Paternity' },
];

const EMPTY_FORM = {
  employeeId: '',
  type: 'annual',
  startDate: '',
  endDate: '',
  reason: '',
};

const Leaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [decision, setDecision] = useState(null); // { row, action }
  const [decisionRemarks, setDecisionRemarks] = useState('');

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
      });
      if (status !== 'all') params.set('status', status);

      const { data } = await api.get(`/leaves?${params.toString()}`);
      setLeaves(data.data || []);
      setTotalEntries(data.totalEntries || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load leaves');
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, status]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const openModal = async () => {
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
    if (employees.length === 0) {
      try {
        const { data } = await api.get('/employees?status=active&limit=100');
        setEmployees(data.data || []);
      } catch (error) {
        toast.error(
          error.response?.data?.message || 'Failed to load employees',
        );
      }
    }
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId) return toast.error('Please select an employee');
    if (!form.startDate || !form.endDate)
      return toast.error('Please select a start and end date');
    if (new Date(form.endDate) < new Date(form.startDate))
      return toast.error('End date cannot be before start date');

    try {
      setSubmitting(true);
      await api.post('/leaves', {
        employeeId: form.employeeId,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
      });
      toast.success('Leave request created');
      setIsModalOpen(false);
      setCurrentPage(1);
      fetchLeaves();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to create leave request',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const requestDecision = (row, action) => {
    setDecisionRemarks('');
    setDecision({ row, action });
  };

  const confirmDecision = async () => {
    if (!decision) return;
    const { row, action } = decision;
    try {
      setActingId(row._id);
      await api.put(`/leaves/${row._id}/${action}`, { remarks: decisionRemarks });
      toast.success(`Leave ${action === 'approve' ? 'approved' : 'rejected'}`);
      setDecision(null);
      fetchLeaves();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${action} leave`);
    } finally {
      setActingId(null);
    }
  };

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
            {capitalize(row.employee?.name) || '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.employee?.employeeId || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className="capitalize text-sm font-medium text-slate-600 dark:text-slate-300">
          {row.type}
        </span>
      ),
    },
    {
      key: 'range',
      header: 'Date Range',
      render: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {formatDate(row.startDate)} – {formatDate(row.endDate)}
        </span>
      ),
    },
    {
      key: 'totalDays',
      header: 'Days',
      align: 'center',
      render: (row) => (
        <span className="font-semibold tabular-nums">{row.totalDays}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) =>
        row.status === 'pending' ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="success"
              className="h-8 rounded-full px-3 font-bold text-white"
              isLoading={actingId === row._id}
              disabled={actingId === row._id}
              onClick={() => requestDecision(row, 'approve')}
            >
              <Check className="mr-1 h-3.5 w-3.5" strokeWidth={2.5} />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-full px-3 font-bold text-rose-600 hover:text-rose-700"
              disabled={actingId === row._id}
              onClick={() => requestDecision(row, 'reject')}
            >
              <X className="mr-1 h-3.5 w-3.5" strokeWidth={2.5} />
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Leaves"
        description="Review and manage employee leave requests."
        action={
          <Button onClick={openModal} className="rounded-full font-bold">
            <Plus className="mr-2 h-4 w-4" strokeWidth={2.5} />
            New Leave Request
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-[2rem] border border-slate-100 bg-white p-5 dark:border-white/[0.06] dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-end">
        <PillSelect
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setCurrentPage(1);
          }}
          options={STATUS_OPTIONS}
          placeholder="All Statuses"
          className="w-44"
        />
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white dark:border-white/[0.06] dark:bg-white/[0.02]">
        <DataTable
          columns={columns}
          data={leaves}
          loading={loading}
          emptyState={{
            icon: CalendarOff,
            title: 'No Leave Requests',
            description:
              status === 'all'
                ? 'Leave requests will appear here once submitted.'
                : `No ${status} leave requests found.`,
          }}
        />

        {!loading && totalEntries > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalEntries={totalEntries}
            limit={limit}
            onPageChange={setCurrentPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Leave Request</DialogTitle>
            <DialogDescription>
              Submit a leave request on behalf of an employee.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Employee" required>
              <PillSelect
                value={form.employeeId}
                onValueChange={(v) => setField('employeeId', v)}
                placeholder="Select employee"
                className="w-full"
                options={employees.map((emp) => ({
                  value: emp._id,
                  label: `${capitalize(emp.name)}${
                    emp.employeeId ? ` (${emp.employeeId})` : ''
                  }`,
                }))}
              />
            </FormField>

            <FormField label="Leave Type" required>
              <PillSelect
                value={form.type}
                onValueChange={(v) => setField('type', v)}
                options={TYPE_OPTIONS}
                placeholder="Select type"
                className="w-full"
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Start Date" htmlFor="leave-start" required>
                <DatePicker
                  id="leave-start"
                  value={form.startDate}
                  onChange={(v) => setField('startDate', v)}
                  placeholder="Start date"
                />
              </FormField>
              <FormField label="End Date" htmlFor="leave-end" required>
                <DatePicker
                  id="leave-end"
                  value={form.endDate}
                  onChange={(v) => setField('endDate', v)}
                  minDate={form.startDate ? new Date(form.startDate) : undefined}
                  placeholder="End date"
                />
              </FormField>
            </div>

            <FormField label="Reason" htmlFor="leave-reason">
              <Textarea
                id="leave-reason"
                value={form.reason}
                onChange={(e) => setField('reason', e.target.value)}
                placeholder="Reason for leave (optional)"
              />
            </FormField>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-full font-bold"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-full font-bold"
                isLoading={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmActionModal
        isOpen={!!decision}
        onClose={() => setDecision(null)}
        onConfirm={confirmDecision}
        loading={!!decision && actingId === decision.row._id}
        variant={decision?.action === 'approve' ? 'info' : 'danger'}
        title={
          decision?.action === 'approve'
            ? 'Approve leave request?'
            : 'Reject leave request?'
        }
        description={
          decision
            ? `${capitalize(decision.row.employee?.name) || 'This employee'} — ${decision.row.totalDays} day(s).`
            : ''
        }
        confirmText={decision?.action === 'approve' ? 'Approve' : 'Reject'}
      >
        <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Remarks (optional)
        </label>
        <Textarea
          value={decisionRemarks}
          onChange={(e) => setDecisionRemarks(e.target.value)}
          placeholder="Add a note for the employee…"
          rows={2}
        />
      </ConfirmActionModal>
    </div>
  );
};

export default Leaves;
