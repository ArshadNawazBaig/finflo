/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Pencil,
  UserX,
  FileText,
  CalendarDays,
  CalendarCheck,
  Link2,
  Link2Off,
  Wallet,
  Briefcase,
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
import api from '@/lib/axios';
import { formatCurrency, formatDate, capitalize, cn } from '@/lib/utils';
import { toast } from 'sonner';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'salary', label: 'Salary', icon: Wallet },
  { id: 'payslips', label: 'Payslips', icon: FileText },
  { id: 'leaves', label: 'Leave History', icon: CalendarDays },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'account', label: 'Linked Account', icon: Link2 },
];

const Field = ({ label, value, mono }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
      {label}
    </span>
    <span className={cn('text-sm font-bold', mono && 'font-mono')}>
      {value || 'Not provided'}
    </span>
  </div>
);

const Card = ({ title, children }) => (
  <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-6 sm:p-8 space-y-5">
    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
      {title}
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{children}</div>
  </div>
);

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [linkedAccount, setLinkedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
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
      setLinkedAccount(data.linkedAccount || null);
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
      .catch((e) => toast.error(e.response?.data?.message || 'Failed to load payslips'));
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== 'leaves') return;
    api
      .get(`/leaves?employeeId=${id}&page=1&limit=24`)
      .then(({ data }) => setLeaves(data.data || []))
      .catch((e) => toast.error(e.response?.data?.message || 'Failed to load leaves'));
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== 'attendance') return;
    api
      .get(`/attendance/summary/${id}?month=${attMonth}&year=${attYear}`)
      .then(({ data }) => setAttendance(data))
      .catch((e) => toast.error(e.response?.data?.message || 'Failed to load attendance'));
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

  const handleUnlink = async () => {
    try {
      await api.delete(`/employees/${id}/unlink-customer`);
      toast.success('Customer unlinked');
      fetchEmployee();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unlink');
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
        title={capitalize(employee.name)}
        badge={<StatusBadge status={employee.status} />}
        description={
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              {employee.employeeId}
            </span>
            {employee.designation && (
              <span className="text-xs font-medium capitalize">
                {employee.designation}
              </span>
            )}
            {employee.email && (
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <Mail size={14} className="text-primary" />
                {employee.email}
              </span>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/payroll/employees', { state: { editId: employee._id } })}
          >
            <Pencil className="mr-2 h-4 w-4" />
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
            >
              {!terminating && <UserX className="mr-2 h-4 w-4" />}
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
            <Card title="Personal Information">
              <Field label="Full Name" value={capitalize(employee.name)} />
              <Field label="Email" value={employee.email} />
              <Field label="Phone" value={employee.phone} />
              <Field label="CNIC" value={employee.cnic} mono />
              <Field label="Date of Birth" value={employee.dob ? formatDate(employee.dob) : null} />
              <Field label="Address" value={employee.address} />
            </Card>
            <Card title="Employment">
              <Field label="Department" value={employee.department} />
              <Field label="Designation" value={employee.designation} />
              <Field label="Employment Type" value={employee.employmentType} />
              <Field label="Joining Date" value={employee.joiningDate ? formatDate(employee.joiningDate) : null} />
              <Field label="Status" value={employee.status} />
            </Card>
            <Card title="Bank Details">
              <Field label="Bank Name" value={employee.bankName} />
              <Field label="Account Number" value={employee.bankAccountNumber} mono />
              <Field label="Branch" value={employee.bankBranch} />
            </Card>
          </div>
        )}

        {activeTab === 'salary' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Earnings Components">
              <Field label="Basic Salary" value={formatCurrency(employee.basicSalary || 0)} />
              <Field label="House Rent Allowance" value={formatCurrency(employee.houseRentAllowance || 0)} />
              <Field label="Medical Allowance" value={formatCurrency(employee.medicalAllowance || 0)} />
              <Field label="Transport Allowance" value={formatCurrency(employee.transportAllowance || 0)} />
              {(employee.otherAllowances || []).map((a, i) => (
                <Field key={i} label={a.label || 'Other Allowance'} value={formatCurrency(a.amount || 0)} />
              ))}
            </Card>
            <Card title="Deductions Configuration">
              <Field label="Tax Slab Type" value={employee.taxSlabType} />
              <Field label="Tax Rate" value={`${employee.taxRate || 0}%`} />
              <Field label="Provident Fund" value={employee.providentFundEnabled ? `Enabled • ${employee.providentFundRate || 0}%` : 'Disabled'} />
              <Field label="EOBI" value={employee.eobiEnabled ? 'Enabled' : 'Disabled'} />
              <Field label="Savings Contribution" value={formatCurrency(employee.savingsContribution || 0)} />
            </Card>
          </div>
        )}

        {activeTab === 'payslips' && (
          <div className="space-y-3">
            {payslips.length === 0 ? (
              <EmptyState icon={FileText} title="No Payslips" description="No payslips have been generated for this employee yet." />
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
              <EmptyState icon={CalendarDays} title="No Leave Records" description="This employee has not requested any leave." />
            ) : (
              leaves.map((l) => (
                <div
                  key={l._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5 sm:p-6"
                >
                  <div>
                    <div className="text-sm font-black capitalize">{l.type} Leave</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(l.startDate)} → {formatDate(l.endDate)} • {l.totalDays} day(s)
                    </div>
                    {l.reason && (
                      <div className="text-xs text-muted-foreground/80 mt-1">{l.reason}</div>
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
              <Select value={String(attMonth)} onValueChange={(v) => setAttMonth(Number(v))}>
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
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
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

        {activeTab === 'account' && (
          <div className="space-y-6">
            {!linkedAccount ? (
              <EmptyState
                icon={Link2}
                title="No Linked Account"
                description="This employee is not linked to a customer account. Link one to auto-deduct loan EMIs and savings contributions from payroll."
              />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-6 sm:p-8">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Linked Customer
                    </span>
                    <div className="text-lg font-black capitalize">
                      {capitalize(linkedAccount.customer?.name)}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {linkedAccount.customer?.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail size={12} className="text-primary" />
                          {linkedAccount.customer.email}
                        </span>
                      )}
                      {linkedAccount.customer?.trustRating != null && (
                        <span>★ {linkedAccount.customer.trustRating}/10</span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleUnlink}>
                    <Link2Off className="mr-2 h-4 w-4" />
                    Unlink
                  </Button>
                </div>

                {linkedAccount.savings && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      ['Current Balance', linkedAccount.savings.currentBalance],
                      ['Savings Balance', linkedAccount.savings.savingBalance],
                      ['Share Balance', linkedAccount.savings.shareBalance],
                    ].map(([label, amount]) => (
                      <div
                        key={label}
                        className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5"
                      >
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          {label}
                        </div>
                        <div className="text-lg font-black font-mono mt-1">
                          {formatCurrency(amount || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
                  <div className="px-6 sm:px-8 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center gap-2">
                    <Briefcase size={14} className="text-primary" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                      Loans
                    </span>
                  </div>
                  {(linkedAccount.loans || []).length === 0 ? (
                    <div className="p-6 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                      No loans
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                      {linkedAccount.loans.map((loan) => (
                        <div
                          key={loan._id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 sm:px-8 py-4"
                        >
                          <div>
                            <div className="text-sm font-black font-mono">
                              {formatCurrency(loan.principal || 0)}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                              {loan.interestType} • EMI {formatCurrency(loan.emi || 0)}
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                Remaining
                              </div>
                              <div className="text-sm font-black font-mono text-orange-500">
                                {formatCurrency(loan.remainingAmount || 0)}
                              </div>
                            </div>
                            <StatusBadge status={loan.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
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
    </div>
  );
};

export default EmployeeProfile;
