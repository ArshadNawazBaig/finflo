/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Pencil,
  UserX,
  FileText,
  CalendarDays,
  CalendarCheck,
  Wallet,
  Briefcase,
  Landmark,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PayslipPDFPreview from '@/components/payroll/PayslipPDFPreview';
import AddEmployeeModal from '@/components/payroll/AddEmployeeModal';
import api from '@/lib/axios';
import { formatCurrency, formatDate, capitalize, cn } from '@/lib/utils';
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

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'salary', label: 'Salary', icon: Wallet },
  { id: 'payslips', label: 'Payslips', icon: FileText },
  { id: 'leaves', label: 'Leave History', icon: CalendarDays },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
];

const Field = ({ label, value, mono, capitalize: cap }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
      {label}
    </span>
    <span
      className={cn(
        'text-sm font-bold text-slate-900 dark:text-white',
        mono && 'font-mono',
        cap && 'capitalize',
        !value && 'font-medium text-muted-foreground/60',
      )}
    >
      {value || 'Not provided'}
    </span>
  </div>
);

const Card = ({ title, icon: Icon, children, className, cols = 2 }) => (
  <div
    className={cn(
      'rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-6 sm:p-8 space-y-5',
      className,
    )}
  >
    <div className="flex items-center gap-2.5">
      {Icon && (
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={14} />
        </span>
      )}
      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h3>
    </div>
    <div
      className={cn(
        'grid gap-5',
        cols === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2',
      )}
    >
      {children}
    </div>
  </div>
);

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');

  const [payslips, setPayslips] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const now = new Date();
  const [attMonth, setAttMonth] = useState(now.getMonth() + 1);
  const [attYear] = useState(now.getFullYear());

  const fetchEmployee = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/employees/${id}`);
      setEmployee(data.employee);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load employee');
      navigate('/payroll/employees');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  useEffect(() => {
    if (activeTab !== 'payslips') return;
    api
      .get(`/employees/${id}/payslips?page=1&limit=24`)
      .then(({ data }) => setPayslips(data.data || []))
      .catch((e) =>
        toast.error(e.response?.data?.message || 'Failed to load payslips'),
      );
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== 'leaves') return;
    api
      .get(`/leaves?employeeId=${id}&page=1&limit=24`)
      .then(({ data }) => setLeaves(data.data || []))
      .catch((e) =>
        toast.error(e.response?.data?.message || 'Failed to load leaves'),
      );
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== 'attendance') return;
    api
      .get(`/attendance/summary/${id}?month=${attMonth}&year=${attYear}`)
      .then(({ data }) => setAttendance(data))
      .catch((e) =>
        toast.error(e.response?.data?.message || 'Failed to load attendance'),
      );
  }, [activeTab, id, attMonth, attYear]);

  const handleTerminate = async () => {
    try {
      setTerminating(true);
      await api.delete(`/employees/${id}`, {
        data: { reason: terminateReason },
      });
      toast.success('Employee terminated');
      setTerminateOpen(false);
      setTerminateReason('');
      fetchEmployee();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to terminate');
    } finally {
      setTerminating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-[2rem]" />
        <Skeleton className="h-10 w-96 rounded-full" />
        <Skeleton className="h-80 w-full rounded-[2rem]" />
      </div>
    );
  }

  if (!employee) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        variant="card"
        icon={User}
        onBack={() => navigate('/payroll/employees')}
        eyebrow={employee.employeeId}
        title={capitalize(employee.name)}
        badge={<StatusBadge status={employee.status} />}
        description={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
            {employee.designation && (
              <div className="flex items-center gap-1.5 text-xs font-medium capitalize">
                <Briefcase size={14} className="text-primary" />
                {employee.designation}
              </div>
            )}
            {employee.email && (
              <>
                <div className="hidden h-1 w-1 rounded-full bg-border sm:block" />
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Mail size={14} className="text-primary" />
                  {employee.email}
                </div>
              </>
            )}
            {employee.phone && (
              <>
                <div className="hidden h-1 w-1 rounded-full bg-border sm:block" />
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Phone size={14} className="text-primary" />
                  {employee.phone}
                </div>
              </>
            )}
          </div>
        }
      >
        <div className="flex w-full items-center gap-2 md:w-auto">
          <Button
            variant="outline"
            onClick={() => setEditOpen(true)}
            className="flex-1 rounded-full font-bold md:flex-none"
          >
            <Pencil className="mr-2 h-4 w-4" strokeWidth={2.5} />
            Edit
          </Button>
          {employee.status !== 'terminated' && (
            <Button
              variant="destructive"
              isLoading={terminating}
              onClick={() => {
                setTerminateReason('');
                setTerminateOpen(true);
              }}
              className="flex-1 rounded-full font-bold md:flex-none"
            >
              {!terminating && <UserX className="mr-2 h-4 w-4" strokeWidth={2.5} />}
              Terminate
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-100 dark:border-white/[0.06] overflow-x-auto">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setActiveTab(tabId)}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap',
              activeTab === tabId
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white',
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px] animate-in fade-in slide-in-from-bottom-2">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Personal Information" icon={User}>
              <Field label="Full Name" value={capitalize(employee.name)} capitalize />
              <Field label="Email" value={employee.email} />
              <Field label="Phone" value={employee.phone} />
              <Field label="CNIC" value={employee.cnic} mono />
              <Field
                label="Date of Birth"
                value={employee.dob ? formatDate(employee.dob) : null}
              />
              <Field label="Address" value={employee.address} capitalize />
            </Card>
            <Card title="Employment" icon={Briefcase}>
              <Field label="Department" value={employee.department} capitalize />
              <Field label="Designation" value={employee.designation} capitalize />
              <Field
                label="Employment Type"
                value={employee.employmentType}
                capitalize
              />
              <Field
                label="Joining Date"
                value={
                  employee.joiningDate ? formatDate(employee.joiningDate) : null
                }
              />
              <Field label="Status" value={employee.status} capitalize />
            </Card>
            <Card
              title="Bank Details"
              icon={Landmark}
              className="lg:col-span-2"
              cols={3}
            >
              <Field label="Bank Name" value={employee.bankName} capitalize />
              <Field
                label="Account Number"
                value={employee.bankAccountNumber}
                mono
              />
              <Field label="Branch" value={employee.bankBranch} capitalize />
            </Card>
          </div>
        )}

        {activeTab === 'salary' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {employee.payType === 'variable' ? (
              <Card title="Compensation" icon={Wallet}>
                <Field label="Pay Type" value="Variable / Freelance" />
                <Field
                  label="Reference Rate"
                  value={`${formatCurrency(employee.payRate || 0)} / ${employee.payRateUnit || 'month'}`}
                />
                <Field label="Monthly Pay" value="Entered per payroll run" />
              </Card>
            ) : (
              <Card title="Earnings Components" icon={Wallet}>
                <Field label="Pay Type" value="Fixed Salary" />
                <Field
                  label="Basic Salary"
                  value={formatCurrency(employee.basicSalary || 0)}
                />
                <Field
                  label="House Rent Allowance"
                  value={formatCurrency(employee.houseRentAllowance || 0)}
                />
                <Field
                  label="Medical Allowance"
                  value={formatCurrency(employee.medicalAllowance || 0)}
                />
                <Field
                  label="Transport Allowance"
                  value={formatCurrency(employee.transportAllowance || 0)}
                />
                {(employee.otherAllowances || []).map((a, i) => (
                  <Field
                    key={i}
                    label={a.label || 'Other Allowance'}
                    value={formatCurrency(a.amount || 0)}
                  />
                ))}
              </Card>
            )}
            <Card title="Deductions Configuration" icon={Wallet}>
              <Field label="Tax Slab Type" value={employee.taxSlabType} capitalize />
              <Field label="Tax Rate" value={`${employee.taxRate || 0}%`} />
              <Field
                label="Provident Fund"
                value={
                  employee.providentFundEnabled
                    ? `Enabled • ${employee.providentFundRate || 0}%`
                    : 'Disabled'
                }
              />
              <Field
                label="EOBI"
                value={employee.eobiEnabled ? 'Enabled' : 'Disabled'}
              />
              <Field
                label="Savings Contribution"
                value={formatCurrency(employee.savingsContribution || 0)}
              />
            </Card>
          </div>
        )}

        {activeTab === 'payslips' && (
          <div className="space-y-3">
            {payslips.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No Payslips"
                description="No payslips have been generated for this employee yet."
              />
            ) : (
              payslips.map((p) => (
                <div
                  key={p._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5 sm:p-6"
                >
                  <div>
                    <div className="text-sm font-black tracking-tight">
                      {MONTHS[(p.month || 1) - 1]} {p.year}
                    </div>
                    <div className="text-lg font-black font-mono text-primary mt-0.5">
                      {formatCurrency(p.netPay || 0)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={p.status} />
                    <PayslipPDFPreview payslipId={p._id} size="sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'leaves' && (
          <div className="space-y-3">
            {leaves.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No Leave Records"
                description="This employee has not requested any leave."
              />
            ) : (
              leaves.map((l) => (
                <div
                  key={l._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5 sm:p-6"
                >
                  <div>
                    <div className="text-sm font-black capitalize">
                      {l.type} Leave
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(l.startDate)} → {formatDate(l.endDate)} •{' '}
                      {l.totalDays} day(s)
                    </div>
                    {l.reason && (
                      <div className="text-xs text-muted-foreground/80 mt-1">
                        {l.reason}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="w-44">
              <Select
                value={String(attMonth)}
                onValueChange={(v) => setAttMonth(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m} {attYear}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!attendance ? (
              <Skeleton className="h-32 w-full rounded-[2rem]" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  ['Present', attendance.summary?.present],
                  ['Absent', attendance.summary?.absent],
                  ['Late', attendance.summary?.late],
                  ['Half Day', attendance.summary?.['half-day']],
                  ['Holiday', attendance.summary?.holiday],
                  ['Leave', attendance.summary?.leave],
                ].map(([label, count]) => (
                  <div
                    key={label}
                    className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5 text-center"
                  >
                    <div className="text-2xl font-black">{count || 0}</div>
                    <div className="text-[10px] font-black capitalize tracking-widest text-muted-foreground mt-1">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {attendance && (
              <div className="text-xs font-bold text-muted-foreground">
                Total Overtime: {attendance.totalOvertime || 0} hour(s)
              </div>
            )}
          </div>
        )}

      </div>

      <ConfirmActionModal
        isOpen={terminateOpen}
        onClose={() => setTerminateOpen(false)}
        onConfirm={handleTerminate}
        loading={terminating}
        variant="danger"
        title={`Terminate ${capitalize(employee?.name) || 'this employee'}?`}
        description="They'll be marked terminated and excluded from future payroll runs. Their payslip history is retained."
        confirmText="Terminate"
      >
        <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Reason (optional)
        </label>
        <Textarea
          value={terminateReason}
          onChange={(e) => setTerminateReason(e.target.value)}
          placeholder="e.g. Resigned, end of contract…"
          rows={2}
        />
      </ConfirmActionModal>

      <AddEmployeeModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={fetchEmployee}
        initialData={employee}
      />
    </div>
  );
};

export default EmployeeProfile;
