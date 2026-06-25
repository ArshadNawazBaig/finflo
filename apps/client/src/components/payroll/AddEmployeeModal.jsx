/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect, useCallback } from 'react';
import {
  User,
  Briefcase,
  Wallet,
  Landmark,
  Plus,
  X,
  Check,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ModalShell } from '@/components/ui/ModalShell';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import Switch from '@/components/ui/switch';
import PillSelect from '@/components/ui/PillSelect';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { cn, formatCNIC } from '@/lib/utils';

const EMPLOYMENT_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'on-leave', label: 'On Leave' },
  { value: 'probation', label: 'Probation' },
  { value: 'terminated', label: 'Terminated' },
];

const TAX_SLAB_TYPES = [
  { value: 'flat', label: 'Flat Rate' },
  { value: 'slab', label: 'Slab-based' },
];

const PAY_TYPES = [
  { value: 'fixed', label: 'Fixed Salary' },
  { value: 'variable', label: 'Variable / Freelance' },
];

const RATE_UNITS = [
  { value: 'hour', label: 'Per hour' },
  { value: 'day', label: 'Per day' },
  { value: 'month', label: 'Per month' },
  { value: 'task', label: 'Per task / project' },
];

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  cnic: '',
  address: '',
  dob: '',
  department: '',
  designation: '',
  employmentType: 'full-time',
  status: 'active',
  payType: 'fixed',
  payRate: '',
  payRateUnit: 'month',
  basicSalary: '',
  houseRentAllowance: '',
  medicalAllowance: '',
  transportAllowance: '',
  otherAllowances: [],
  savingsContribution: '',
  providentFundEnabled: false,
  providentFundRate: '',
  eobiEnabled: false,
  taxSlabType: 'flat',
  taxRate: '',
  bankName: '',
  bankAccountNumber: '',
  bankBranch: '',
};

const STEPS = [
  { key: 'personal', label: 'Personal', icon: User },
  { key: 'employment', label: 'Employment', icon: Briefcase },
  { key: 'salary', label: 'Salary', icon: Wallet },
  { key: 'bank', label: 'Bank', icon: Landmark },
];

const StepIndicator = ({ steps, current }) => (
  <div className="flex items-center justify-center gap-2 px-6 pt-1 pb-4 sm:px-7">
    {steps.map((step, i) => {
      const Icon = step.icon;
      const done = i < current;
      const active = i === current;
      return (
        <div key={step.key} className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
              active && 'bg-primary text-primary-foreground',
              done && 'bg-emerald-500 text-white',
              !active && !done && 'bg-slate-100 text-slate-400 dark:bg-white/[0.06]',
            )}
          >
            {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'h-0.5 w-10 shrink-0 rounded-full transition-colors',
                i < current ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-white/[0.06]',
              )}
            />
          )}
        </div>
      );
    })}
  </div>
);

const AddEmployeeModal = ({ isOpen, onClose, onSuccess, initialData }) => {
  const isEdit = !!initialData;
  const stepDefs = STEPS;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(false);

  // Department pick-list + inline create
  const [departments, setDepartments] = useState([]);
  const [creatingDept, setCreatingDept] = useState(false);
  const [newDept, setNewDept] = useState('');
  const [savingDept, setSavingDept] = useState(false);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data } = await api.get('/payroll/departments?limit=200');
      setDepartments(data.data || []);
    } catch {
      // Non-fatal — the picker just shows the current value.
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchDepartments();
  }, [isOpen, fetchDepartments]);

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setCreatingDept(false);
    setNewDept('');
    if (initialData) {
      setForm({
        ...EMPTY_FORM,
        ...initialData,
        dob: initialData.dob ? initialData.dob.split('T')[0] : '',
        otherAllowances: initialData.otherAllowances || [],
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, initialData]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleCreateDept = async () => {
    const name = newDept.trim();
    if (!name) return;
    try {
      setSavingDept(true);
      const { data: created } = await api.post('/payroll/departments', { name });
      setDepartments((prev) => [...prev, created]);
      setField('department', created.name);
      setCreatingDept(false);
      setNewDept('');
      toast.success('Department created');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create department');
    } finally {
      setSavingDept(false);
    }
  };

  const addAllowanceRow = () =>
    setField('otherAllowances', [...form.otherAllowances, { label: '', amount: '' }]);

  const updateAllowanceRow = (idx, key, value) =>
    setField(
      'otherAllowances',
      form.otherAllowances.map((row, i) =>
        i === idx ? { ...row, [key]: value } : row,
      ),
    );

  const removeAllowanceRow = (idx) =>
    setField(
      'otherAllowances',
      form.otherAllowances.filter((_, i) => i !== idx),
    );

  const buildPayload = () => {
    const num = (v) => (v === '' || v == null ? undefined : Number(v));
    const isVariable = form.payType === 'variable';
    return {
      name: form.name,
      email: form.email,
      phone: form.phone,
      cnic: form.cnic,
      address: form.address,
      dob: form.dob || undefined,
      department: form.department,
      designation: form.designation,
      employmentType: form.employmentType,
      status: form.status,
      payType: form.payType,
      payRate: isVariable ? num(form.payRate) : 0,
      payRateUnit: isVariable ? form.payRateUnit : 'month',
      // Variable/freelance employees carry no static salary structure — their
      // pay is entered per payroll run.
      basicSalary: isVariable ? 0 : num(form.basicSalary),
      houseRentAllowance: isVariable ? 0 : num(form.houseRentAllowance),
      medicalAllowance: isVariable ? 0 : num(form.medicalAllowance),
      transportAllowance: isVariable ? 0 : num(form.transportAllowance),
      otherAllowances: isVariable
        ? []
        : form.otherAllowances
            .filter((row) => row.label && row.amount !== '')
            .map((row) => ({ label: row.label, amount: Number(row.amount) })),
      savingsContribution: isVariable ? 0 : num(form.savingsContribution),
      providentFundEnabled: isVariable ? false : form.providentFundEnabled,
      providentFundRate:
        !isVariable && form.providentFundEnabled ? num(form.providentFundRate) : undefined,
      eobiEnabled: isVariable ? false : form.eobiEnabled,
      taxSlabType: form.taxSlabType,
      taxRate: form.taxSlabType === 'flat' ? num(form.taxRate) : undefined,
      bankName: form.bankName,
      bankAccountNumber: form.bankAccountNumber,
      bankBranch: form.bankBranch,
    };
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.cnic.trim()) {
      toast.error('Name and CNIC are required');
      setStep(0);
      return;
    }
    setIsLoading(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await api.put(`/employees/${initialData._id}`, payload);
        toast.success('Employee updated successfully');
      } else {
        await api.post('/employees', payload);
        toast.success('Employee added successfully');
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save employee');
    } finally {
      setIsLoading(false);
    }
  };

  const isLastStep = step === stepDefs.length - 1;

  // A complete Pakistani CNIC is exactly 13 digits.
  const cnicDigits = form.cnic.replace(/\D/g, '');

  // Required-field gate per step — Next/Submit stays disabled until the current
  // step's required fields are filled (name + a complete CNIC on Personal).
  const isStepValid = () => {
    if (stepDefs[step].key === 'personal') {
      return form.name.trim().length > 0 && cnicDigits.length === 13;
    }
    return true;
  };

  const next = () =>
    isStepValid() && setStep((s) => Math.min(s + 1, stepDefs.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const renderStep = () => {
    switch (stepDefs[step].key) {
      case 'personal':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Full Name" htmlFor="emp-name" required className="sm:col-span-2">
              <Input
                id="emp-name"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="e.g. ali raza"
              />
            </FormField>
            <FormField
              label="CNIC"
              htmlFor="emp-cnic"
              required
              hint={
                cnicDigits.length > 0 && cnicDigits.length < 13
                  ? 'CNIC must be 13 digits'
                  : undefined
              }
            >
              <Input
                id="emp-cnic"
                value={form.cnic}
                onChange={(e) => setField('cnic', formatCNIC(e.target.value))}
                placeholder="00000-0000000-0"
                inputMode="numeric"
                className="font-mono tabular-nums"
              />
            </FormField>
            <FormField label="Date of Birth" htmlFor="emp-dob">
              <DatePicker
                id="emp-dob"
                value={form.dob}
                onChange={(v) => setField('dob', v)}
                maxDate={new Date()}
                placeholder="Select date of birth"
              />
            </FormField>
            <FormField label="Email" htmlFor="emp-email">
              <Input
                id="emp-email"
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="name@company.com"
              />
            </FormField>
            <FormField label="Phone" htmlFor="emp-phone">
              <Input
                id="emp-phone"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="03xx-xxxxxxx"
              />
            </FormField>
            <FormField label="Address" htmlFor="emp-address" className="sm:col-span-2">
              <Textarea
                id="emp-address"
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
                placeholder="Residential address"
                rows={2}
              />
            </FormField>
          </div>
        );
      case 'employment':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Department" htmlFor="emp-dept">
              {creatingDept ? (
                <div className="flex items-center gap-2">
                  <Input
                    id="emp-dept"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateDept()}
                    placeholder="New department name"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={handleCreateDept}
                    isLoading={savingDept}
                    className="shrink-0 text-emerald-600 hover:text-emerald-700"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setCreatingDept(false);
                      setNewDept('');
                    }}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <PillSelect
                    value={form.department || ''}
                    onValueChange={(v) => setField('department', v)}
                    options={[
                      ...(form.department &&
                      !departments.some((d) => d.name === form.department)
                        ? [{ value: form.department, label: form.department }]
                        : []),
                      ...departments.map((d) => ({ value: d.name, label: d.name })),
                    ]}
                    placeholder="Select department"
                    className="w-full"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCreatingDept(true);
                      setNewDept('');
                    }}
                    className="shrink-0"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    New
                  </Button>
                </div>
              )}
            </FormField>
            <FormField label="Designation" htmlFor="emp-desig">
              <Input
                id="emp-desig"
                value={form.designation}
                onChange={(e) => setField('designation', e.target.value)}
                placeholder="e.g. Loan Officer"
              />
            </FormField>
            <FormField label="Employment Type">
              <PillSelect
                value={form.employmentType}
                onValueChange={(v) => setField('employmentType', v)}
                options={EMPLOYMENT_TYPES}
                className="w-full"
              />
            </FormField>
            <FormField label="Status">
              <PillSelect
                value={form.status}
                onValueChange={(v) => setField('status', v)}
                options={STATUSES}
                className="w-full"
              />
            </FormField>
          </div>
        );
      case 'salary':
        return (
          <div className="space-y-4">
            {/* Compensation type — fixed salary vs variable/freelance */}
            <div className="space-y-2 rounded-2xl border border-slate-100 dark:border-white/[0.06] p-4">
              <FormField label="Compensation Type">
                <PillSelect
                  value={form.payType}
                  onValueChange={(v) => setField('payType', v)}
                  options={PAY_TYPES}
                  className="w-full"
                />
              </FormField>
              <p className="text-[11px] text-muted-foreground">
                {form.payType === 'variable'
                  ? 'Freelancers have no fixed salary — enter each month’s pay on the payroll run when you generate it.'
                  : 'A recurring monthly salary built from the components below.'}
              </p>
            </div>

            {form.payType === 'fixed' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Basic Salary" htmlFor="emp-basic">
                    <Input
                      id="emp-basic"
                      type="number"
                      value={form.basicSalary}
                      onChange={(e) => setField('basicSalary', e.target.value)}
                      placeholder="0"
                    />
                  </FormField>
                  <FormField label="House Rent Allowance" htmlFor="emp-hra">
                    <Input
                      id="emp-hra"
                      type="number"
                      value={form.houseRentAllowance}
                      onChange={(e) => setField('houseRentAllowance', e.target.value)}
                      placeholder="0"
                    />
                  </FormField>
                  <FormField label="Medical Allowance" htmlFor="emp-medical">
                    <Input
                      id="emp-medical"
                      type="number"
                      value={form.medicalAllowance}
                      onChange={(e) => setField('medicalAllowance', e.target.value)}
                      placeholder="0"
                    />
                  </FormField>
                  <FormField label="Transport Allowance" htmlFor="emp-transport">
                    <Input
                      id="emp-transport"
                      type="number"
                      value={form.transportAllowance}
                      onChange={(e) => setField('transportAllowance', e.target.value)}
                      placeholder="0"
                    />
                  </FormField>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Other Allowances
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={addAllowanceRow}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                  {form.otherAllowances.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={row.label}
                        onChange={(e) => updateAllowanceRow(idx, 'label', e.target.value)}
                        placeholder="Label"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={row.amount}
                        onChange={(e) => updateAllowanceRow(idx, 'amount', e.target.value)}
                        placeholder="Amount"
                        className="w-32"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAllowanceRow(idx)}
                        className="shrink-0 text-rose-500 hover:text-rose-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <FormField label="Savings Contribution" htmlFor="emp-savings">
                  <Input
                    id="emp-savings"
                    type="number"
                    value={form.savingsContribution}
                    onChange={(e) => setField('savingsContribution', e.target.value)}
                    placeholder="0"
                  />
                </FormField>

                <div className="space-y-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Provident Fund
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Enable to deduct a monthly PF contribution.
                      </p>
                    </div>
                    <Switch
                      checked={form.providentFundEnabled}
                      onCheckedChange={(v) => setField('providentFundEnabled', v)}
                    />
                  </div>
                  {form.providentFundEnabled && (
                    <FormField label="PF Rate (%)" htmlFor="emp-pf-rate">
                      <Input
                        id="emp-pf-rate"
                        type="number"
                        value={form.providentFundRate}
                        onChange={(e) => setField('providentFundRate', e.target.value)}
                        placeholder="0"
                      />
                    </FormField>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        EOBI
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Enrol this employee in EOBI deductions.
                      </p>
                    </div>
                    <Switch
                      checked={form.eobiEnabled}
                      onCheckedChange={(v) => setField('eobiEnabled', v)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Reference Rate"
                  htmlFor="emp-payrate"
                  hint="Optional — for your records. Actual pay is entered each run."
                >
                  <Input
                    id="emp-payrate"
                    type="number"
                    value={form.payRate}
                    onChange={(e) => setField('payRate', e.target.value)}
                    placeholder="0"
                  />
                </FormField>
                <FormField label="Rate Unit">
                  <PillSelect
                    value={form.payRateUnit}
                    onValueChange={(v) => setField('payRateUnit', v)}
                    options={RATE_UNITS}
                    className="w-full"
                  />
                </FormField>
              </div>
            )}

            {/* Tax applies to both fixed and variable pay */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Tax Calculation">
                <PillSelect
                  value={form.taxSlabType}
                  onValueChange={(v) => setField('taxSlabType', v)}
                  options={TAX_SLAB_TYPES}
                  className="w-full"
                />
              </FormField>
              {form.taxSlabType === 'flat' && (
                <FormField label="Tax Rate (%)" htmlFor="emp-tax">
                  <Input
                    id="emp-tax"
                    type="number"
                    value={form.taxRate}
                    onChange={(e) => setField('taxRate', e.target.value)}
                    placeholder="0"
                  />
                </FormField>
              )}
            </div>
          </div>
        );
      case 'bank':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Bank Name" htmlFor="emp-bank" className="sm:col-span-2">
              <Input
                id="emp-bank"
                value={form.bankName}
                onChange={(e) => setField('bankName', e.target.value)}
                placeholder="e.g. Meezan Bank"
              />
            </FormField>
            <FormField label="Account Number" htmlFor="emp-acct">
              <Input
                id="emp-acct"
                value={form.bankAccountNumber}
                onChange={(e) => setField('bankAccountNumber', e.target.value)}
                placeholder="Account / IBAN"
              />
            </FormField>
            <FormField label="Branch" htmlFor="emp-branch">
              <Input
                id="emp-branch"
                value={form.bankBranch}
                onChange={(e) => setField('bankBranch', e.target.value)}
                placeholder="Branch name / code"
              />
            </FormField>
          </div>
        );
      default:
        return null;
    }
  };

  const footer = (
    <>
      {step > 0 ? (
        <Button
          type="button"
          variant="outline"
          onClick={back}
          disabled={isLoading}
          className="h-11 px-5 rounded-full font-bold"
        >
          Back
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={isLoading}
          className="h-11 px-5 rounded-full font-semibold"
        >
          Cancel
        </Button>
      )}
      {isLastStep ? (
        <Button
          type="button"
          onClick={handleSubmit}
          isLoading={isLoading}
          className="h-11 px-7 rounded-full font-bold"
        >
          {isEdit ? 'Save Changes' : 'Create Employee'}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={next}
          disabled={!isStepValid()}
          className="h-11 px-7 rounded-full font-bold"
        >
          Next
        </Button>
      )}
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* flex flex-col + gap-0 + overflow-y-hidden neutralise the base
          DialogContent's grid/gap-5/overflow-y-auto so ModalShell's body is the
          scroller and the footer stays pinned (otherwise the dialog scrolls and
          the footer is pushed below the fold). */}
      <DialogContent className="p-0 gap-0 flex flex-col overflow-hidden overflow-y-hidden max-h-[90vh] sm:max-w-2xl">
        <ModalShell
          icon={STEPS[step]?.icon}
          title={<DialogTitle>{isEdit ? 'Edit Employee' : 'Add Employee'}</DialogTitle>}
          description={
            <DialogDescription>
              {`Step ${step + 1} of ${stepDefs.length} — ${stepDefs[step].label}`}
            </DialogDescription>
          }
          footer={footer}
        >
          <StepIndicator steps={stepDefs} current={step} />
          {renderStep()}
        </ModalShell>
      </DialogContent>
    </Dialog>
  );
};

export default AddEmployeeModal;
