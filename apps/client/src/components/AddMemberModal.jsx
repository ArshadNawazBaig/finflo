import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, UserPlus, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import SignaturePad from '@/components/ui/SignaturePad';
import {
  formatCNIC,
  validateEmail,
  generateDynamicAccountNumber,
} from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import KycOcrScanner from './kyc/KycOcrScanner';

const AddMemberModal = ({ isOpen, onClose, onSuccess }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}') || {};
  const [loading, setLoading] = useState(false);
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [branches, setBranches] = useState([]);
  const [savingAccountNumber, setSavingAccountNumber] = useState('');
  const [currentAccountNumber, setCurrentAccountNumber] = useState('');
  const [loanAccountNumber, setLoanAccountNumber] = useState('');
  const [signature, setSignature] = useState('');
  const [nominee, setNominee] = useState({
    name: '',
    cnic: '',
    relation: '',
    cnicImage: '',
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      cnic: '',
      name: '',
      email: '',
      phone: '',
      address: '',
      branchId: '',
      job: '',
      jobDetail: '',
      monthlyIncome: '',
      initialInvestment: '',
      profitRate: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (user.role === 'staff' && user.branchId) {
        setValue('branchId', user.branchId);
      } else {
        const fetchBranches = async () => {
          setFetchingBranches(true);
          try {
            const { data } = await api.get('/branches');
            setBranches(data);
          } catch (err) {
            console.error('Failed to fetch branches', err);
          } finally {
            setFetchingBranches(false);
          }
        };
        fetchBranches();
      }
    }
  }, [isOpen, user.role, user.branchId]);

  const handleOcrData = (data) => {
    if (data.name) setValue('name', data.name);
    if (data.cnic) setValue('cnic', data.cnic);
    if (data.email) setValue('email', data.email);
    if (data.phone) setValue('phone', data.phone);
  };

  const generateAccountNumber = (type = 'savingAccountNumber') => {
    const prefix =
      type === 'savingAccountNumber'
        ? 'SAV'
        : type === 'currentAccountNumber'
          ? 'CUR'
          : 'LON';
    const result = generateDynamicAccountNumber(user, prefix);
    if (type === 'savingAccountNumber') setSavingAccountNumber(result);
    else if (type === 'currentAccountNumber') setCurrentAccountNumber(result);
    else setLoanAccountNumber(result);
  };

  const handleNomineeImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('CNIC image exceeds 2MB limit');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNominee((prev) => ({ ...prev, cnicImage: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (formData) => {
    setLoading(true);

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      setError('email', { message: emailValidation.message });
      setLoading(false);
      return;
    }

    try {
      await api.post('/members', {
        ...formData,
        cnic: formData.cnic?.trim(),
        name: formData.name?.trim().toLowerCase(),
        email: formData.email?.trim().toLowerCase(),
        monthlyIncome: formData.monthlyIncome
          ? Number(formData.monthlyIncome)
          : undefined,
        initialInvestment: parseFloat(formData.initialInvestment) || 0,
        profitRate: parseFloat(formData.profitRate) || 0,
        savingAccountNumber: savingAccountNumber || undefined,
        currentAccountNumber: currentAccountNumber || undefined,
        loanAccountNumber: loanAccountNumber || undefined,
        signature: signature || undefined,
        nominee: {
          name: nominee.name || '',
          cnic: nominee.cnic || '',
          relation: nominee.relation || '',
          cnicImage: nominee.cnicImage || '',
        },
      });
      toast.success('Member added successfully');
      onSuccess();
      onClose();
      reset();
      setSavingAccountNumber('');
      setCurrentAccountNumber('');
      setLoanAccountNumber('');
      setSignature('');
      setNominee({ name: '', cnic: '', relation: '', cnicImage: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
      setError('root', {
        message: err.response?.data?.message || 'Failed to add member',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[95vh] !p-0 !gap-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 sm:p-7 pb-5 border-b border-slate-100 dark:border-white/[0.06] z-10">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
                <UserPlus />
              </div>
              <div className="min-w-0 flex-1 pr-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1.5">
                  Member onboarding
                </p>
                <DialogTitle>Add New Member</DialogTitle>
                <DialogDescription className="mt-1">
                  Onboard a new investor for profit distribution.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 custom-scrollbar">
          {errors.root && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 p-4 text-xs font-bold uppercase tracking-wider mb-6 animate-in fade-in zoom-in-95">
              {errors.root.message}
            </div>
          )}

          <div className="mb-8">
            <KycOcrScanner onDataExtracted={handleOcrData} />
          </div>

          <form
            id="add-member-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter name"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('name', { required: 'Full name is required' })}
                  />
                  {errors.name && (
                    <p className="text-rose-500 text-[10px] font-bold pl-1 mt-1 animate-in fade-in slide-in-from-top-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    CNIC Number *
                  </label>
                  <input
                    type="text"
                    placeholder="00000-0000000-0"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-extrabold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('cnic', { required: 'CNIC is required' })}
                    onChange={(e) => {
                      setValue('cnic', formatCNIC(e.target.value));
                    }}
                  />
                  {errors.cnic && (
                    <p className="text-rose-500 text-[10px] font-bold pl-1 mt-1 animate-in fade-in slide-in-from-top-1">
                      {errors.cnic.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    placeholder="member@example.com"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('email', { required: 'Email is required' })}
                  />
                  {errors.email && (
                    <p className="text-rose-500 text-[10px] font-bold pl-1 mt-1 animate-in fade-in slide-in-from-top-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="+92 300 1234567"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('phone', {
                      required: 'Phone number is required',
                    })}
                  />
                  {errors.phone && (
                    <p className="text-rose-500 text-[10px] font-bold pl-1 mt-1 animate-in fade-in slide-in-from-top-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Occupation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Business"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('job')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Monthly Income
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('monthlyIncome')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                  Job Detail & Office Address
                </label>
                <textarea
                  placeholder="Details of job and office location..."
                  className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none"
                  {...register('jobDetail')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                  Residential Address
                </label>
                <textarea
                  placeholder="Enter complete address..."
                  className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none"
                  {...register('address')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                  Branch Selection
                </label>
                {user.role === 'staff' ? (
                  <div className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 italic">
                    Assigned to your branch
                  </div>
                ) : (
                  <select
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                    {...register('branchId', {
                      required: 'Branch is required',
                    })}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.branchId && (
                  <p className="text-rose-500 text-[10px] font-bold pl-1 mt-1 animate-in fade-in slide-in-from-top-1">
                    {errors.branchId.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Saving Account
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={savingAccountNumber}
                      placeholder="Gen ->"
                      className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-extrabold tabular-nums font-mono focus:outline-none"
                    />
                    {!savingAccountNumber && (
                      <Button
                        type="button"
                        onClick={() =>
                          generateAccountNumber('savingAccountNumber')
                        }
                        className="rounded-full px-4 py-3 bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)]"
                      >
                        Gen
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Current Account
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={currentAccountNumber}
                      placeholder="Gen ->"
                      className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-extrabold tabular-nums font-mono focus:outline-none"
                    />
                    {!currentAccountNumber && (
                      <Button
                        type="button"
                        onClick={() =>
                          generateAccountNumber('currentAccountNumber')
                        }
                        className="rounded-full px-4 py-3 bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)]"
                      >
                        Gen
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Loan Account
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={loanAccountNumber}
                      placeholder="Gen ->"
                      className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-extrabold tabular-nums font-mono focus:outline-none"
                    />
                    {!loanAccountNumber && (
                      <Button
                        type="button"
                        onClick={() =>
                          generateAccountNumber('loanAccountNumber')
                        }
                        className="rounded-full px-4 py-3 bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)]"
                      >
                        Gen
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Initial Investment
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-extrabold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('initialInvestment')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Profit Rate (%)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-extrabold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('profitRate')}
                  />
                </div>
              </div>

              {/* Nominee */}
              <div className="space-y-3 p-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-amber-500/5">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />{' '}
                  Nominee Information
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                      Nominee Name
                    </label>
                    <input
                      type="text"
                      value={nominee.name}
                      onChange={(e) =>
                        setNominee({ ...nominee, name: e.target.value })
                      }
                      placeholder="Full name of nominee"
                      className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                      Nominee CNIC
                    </label>
                    <input
                      type="text"
                      value={nominee.cnic}
                      onChange={(e) =>
                        setNominee({
                          ...nominee,
                          cnic: formatCNIC(e.target.value),
                        })
                      }
                      placeholder="00000-0000000-0"
                      className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-extrabold tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Relation to Member
                  </label>
                  <input
                    type="text"
                    value={nominee.relation}
                    onChange={(e) =>
                      setNominee({ ...nominee, relation: e.target.value })
                    }
                    placeholder="e.g. Spouse, Father, Son"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Nominee CNIC Image
                  </label>
                  <div className="flex flex-col gap-3">
                    {nominee.cnicImage && (
                      <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-slate-100 dark:border-white/[0.06] bg-white shadow-sm flex items-center justify-center p-2">
                        <img
                          src={nominee.cnicImage}
                          alt="CNIC Preview"
                          className="max-w-full max-h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setNominee({ ...nominee, cnicImage: '' })
                          }
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-500 text-white hover:scale-110 transition-transform shadow-lg"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <div className="relative group p-4 border-2 border-dashed border-slate-100 dark:border-white/[0.06] rounded-2xl bg-white dark:bg-white/[0.02] text-center hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all overflow-hidden">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleNomineeImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex flex-col items-center gap-1">
                        <Upload
                          size={16}
                          className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 transition-colors"
                        />
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                          {nominee.cnicImage
                            ? 'Replace CNIC Image'
                            : 'Upload CNIC Front'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Signature *
                </label>
                <SignaturePad
                  onSave={(data) => setSignature(data)}
                  onClear={() => setSignature('')}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-5 border-t border-slate-100 dark:border-white/[0.06] z-10 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
          >
            Cancel
          </button>
          <Button
            form="add-member-form"
            type="submit"
            disabled={loading}
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <UserPlus size={16} />
            )}
            Onboard Member
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberModal;
