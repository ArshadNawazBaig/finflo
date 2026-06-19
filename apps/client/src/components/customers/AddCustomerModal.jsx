import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, UserPlus, X, Upload } from 'lucide-react';
import SignaturePad from '@/components/ui/SignaturePad';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FormField from '@/components/ui/FormField';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AccountNumberGenerator from '../members/AccountNumberGenerator';
import { toast } from 'sonner';
import {
  formatCNIC,
  validateEmail,
  generateDynamicAccountNumber,
} from '@/lib/utils';

import KycOcrScanner from '../kyc/KycOcrScanner';

const AddCustomerModal = ({ isOpen, onClose, onSuccess }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}') || {};
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [branches, setBranches] = useState([]);
  const [files, setFiles] = useState([]);
  const [signature, setSignature] = useState('');
  const [savingAccountNumber, setSavingAccountNumber] = useState('');
  const [currentAccountNumber, setCurrentAccountNumber] = useState('');
  const [nominee, setNominee] = useState({ name: '', cnic: '', relation: '' });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      branchId: '',
      cnic: '',
      job: '',
      jobDetail: '',
      monthlyIncome: '',
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
    toast.success('Fields auto-filled from document');
  };

  const generateAccountNumber = (type = 'savingAccountNumber') => {
    const prefix = type === 'savingAccountNumber' ? 'SAV' : 'CUR';
    const result = generateDynamicAccountNumber(user, prefix);
    if (type === 'savingAccountNumber') setSavingAccountNumber(result);
    else setCurrentAccountNumber(result);
    toast.success(
      `${type === 'savingAccountNumber' ? 'Saving' : 'Current'} number generated`,
    );
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = [];
    if (files.length + selectedFiles.length > 5) {
      toast.error('Maximum 5 files allowed total');
      return;
    }
    selectedFiles.forEach((file) => {
      if (file.size > 1 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 1MB limit`);
      } else {
        validFiles.push(file);
      }
    });
    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      setError('email', { message: emailValidation.message });
      return;
    }

    setLoading(true);

    const payload = {
      ...formData,
      name: formData.name.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
      monthlyIncome: formData.monthlyIncome
        ? Number(formData.monthlyIncome)
        : undefined,
      savingAccountNumber: savingAccountNumber || undefined,
      currentAccountNumber: currentAccountNumber || undefined,
      signature: signature || undefined,
      nominee: {
        name: nominee.name || '',
        cnic: nominee.cnic || '',
        relation: nominee.relation || '',
      },
    };

    try {
      const { data: newCustomer } = await api.post('/customers', payload);

      if (files.length > 0) {
        setUploading(true);
        const data = new FormData();
        files.forEach((file) => {
          data.append('documents', file);
        });
        await api.post(`/customers/${newCustomer._id}/documents`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success('Customer registered successfully');
      onSuccess();
      onClose();
      reset();
      setFiles([]);
      setSignature('');
      setSavingAccountNumber('');
      setCurrentAccountNumber('');
      setNominee({ name: '', cnic: '', relation: '' });
    } catch (err) {
      setError('root', {
        message: err.response?.data?.message || 'Failed to add customer',
      });
      toast.error(err.response?.data?.message || 'Failed to add customer');
    } finally {
      setLoading(false);
      setUploading(false);
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
                  Onboard customer
                </p>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription className="mt-1">
                  Register a new customer to the system.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 pb-10 custom-scrollbar">
          {errors.root && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 p-4 text-xs font-bold uppercase tracking-wider mb-6 animate-in fade-in zoom-in-95">
              {errors.root.message}
            </div>
          )}

          <div className="mb-8">
            <KycOcrScanner onDataExtracted={handleOcrData} />
          </div>

          <form
            id="add-customer-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Full Name"
                  htmlFor="name"
                  required
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                  error={errors.name?.message}
                >
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter name"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                    {...register('name', { required: 'Full name is required' })}
                  />
                </FormField>
                <FormField
                  label="CNIC Number"
                  htmlFor="cnic"
                  required
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                  error={errors.cnic?.message}
                >
                  <Input
                    id="cnic"
                    type="text"
                    placeholder="00000-0000000-0"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-extrabold tabular-nums focus:ring-2 focus:ring-primary/20 transition-all font-mono h-auto"
                    {...register('cnic', { required: 'CNIC is required' })}
                    onChange={(e) =>
                      setValue('cnic', formatCNIC(e.target.value))
                    }
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Email Address"
                  htmlFor="email"
                  required
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                  error={errors.email?.message}
                >
                  <Input
                    id="email"
                    type="email"
                    placeholder="customer@example.com"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                    {...register('email', { required: 'Email is required' })}
                  />
                </FormField>
                <FormField
                  label="Phone Number"
                  htmlFor="phone"
                  required
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                  error={errors.phone?.message}
                >
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+92 300 1234567"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                    {...register('phone', {
                      required: 'Phone number is required',
                    })}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Occupation"
                  htmlFor="job"
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  <Input
                    id="job"
                    type="text"
                    placeholder="e.g. Business"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                    {...register('job')}
                  />
                </FormField>
                <FormField
                  label="Monthly Income"
                  htmlFor="monthlyIncome"
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  <Input
                    id="monthlyIncome"
                    type="number"
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                    {...register('monthlyIncome')}
                  />
                </FormField>
              </div>

              <FormField
                label="Job Detail & Office Address"
                htmlFor="jobDetail"
                labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
              >
                <Textarea
                  id="jobDetail"
                  placeholder="Details of job and office location..."
                  className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none"
                  {...register('jobDetail')}
                />
              </FormField>

              <FormField
                label="Residential Address"
                htmlFor="address"
                labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
              >
                <Textarea
                  id="address"
                  placeholder="Enter complete address..."
                  className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none"
                  {...register('address')}
                />
              </FormField>

              <FormField
                label="Branch Selection"
                htmlFor="branchId"
                labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                error={errors.branchId?.message}
              >
                {user.role === 'staff' ? (
                  <div className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 italic">
                    Assigned to your branch
                  </div>
                ) : (
                  <Controller
                    control={control}
                    name="branchId"
                    rules={{ required: 'Branch is required' }}
                    render={({ field }) => (
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="branchId"
                          className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 h-auto text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                          <SelectValue placeholder="Select Branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b._id} value={b._id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </FormField>

              <AccountNumberGenerator
                saving={savingAccountNumber}
                current={currentAccountNumber}
                onGenerate={generateAccountNumber}
              />

              {/* Nominee */}
              <div className="space-y-3 p-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-amber-500/5">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />{' '}
                  Nominee Information
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Nominee Name"
                    htmlFor="nomineeName"
                    labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                  >
                    <Input
                      id="nomineeName"
                      type="text"
                      value={nominee.name}
                      onChange={(e) =>
                        setNominee({ ...nominee, name: e.target.value })
                      }
                      placeholder="Full name of nominee"
                      className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-amber-500/20 transition-all h-auto"
                    />
                  </FormField>
                  <FormField
                    label="Nominee CNIC"
                    htmlFor="nomineeCnic"
                    labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                  >
                    <Input
                      id="nomineeCnic"
                      type="text"
                      value={nominee.cnic}
                      onChange={(e) =>
                        setNominee({
                          ...nominee,
                          cnic: formatCNIC(e.target.value),
                        })
                      }
                      placeholder="00000-0000000-0"
                      className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-extrabold tabular-nums focus:ring-2 focus:ring-amber-500/20 transition-all font-mono h-auto"
                    />
                  </FormField>
                </div>
                <FormField
                  label="Relation to Customer"
                  htmlFor="nomineeRelation"
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  <Input
                    id="nomineeRelation"
                    type="text"
                    value={nominee.relation}
                    onChange={(e) =>
                      setNominee({ ...nominee, relation: e.target.value })
                    }
                    placeholder="e.g. Spouse, Father, Son"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-amber-500/20 transition-all h-auto"
                  />
                </FormField>
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
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setNominee({ ...nominee, cnicImage: '' })
                          }
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-500 text-white hover:scale-110 transition-transform shadow-lg"
                        >
                          <X size={12} />
                        </Button>
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
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
          >
            Cancel
          </Button>
          <Button
            form="add-customer-form"
            type="submit"
            disabled={loading || uploading}
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
          >
            {loading || uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <UserPlus size={16} />
            )}
            Register Customer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerModal;
