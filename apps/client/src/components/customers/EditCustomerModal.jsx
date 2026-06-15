import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Upload, X, Trash2, UserCircle } from 'lucide-react';
import SignaturePad from '@/components/ui/SignaturePad';
import api from '@/lib/axios';
import { toast } from 'sonner';
import {
  formatCNIC,
  validateEmail,
  generateDynamicAccountNumber,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AccountNumberGenerator from '../members/AccountNumberGenerator';

const EditCustomerModal = ({ isOpen, onClose, customer, onSuccess }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}') || {};
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [files, setFiles] = useState([]);
  const [existingDocs, setExistingDocs] = useState([]);
  const [docsToDelete, setDocsToDelete] = useState([]);
  const [signature, setSignature] = useState('');
  const [savingAccountNumber, setSavingAccountNumber] = useState('');
  const [currentAccountNumber, setCurrentAccountNumber] = useState('');
  const [loanAccountNumber, setLoanAccountNumber] = useState('');
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
  } = useForm();

  useEffect(() => {
    if (isOpen) {
      const fetchBranches = async () => {
        try {
          const { data } = await api.get('/branches');
          setBranches(data);
        } catch (err) {
          console.error('Failed to fetch branches', err);
        }
      };
      fetchBranches();
    }
  }, [isOpen]);

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address || '',
        cnic: customer.cnic || '',
        job: customer.job || '',
        jobDetail: customer.jobDetail || '',
        monthlyIncome: customer.monthlyIncome || '',
        branchId: customer.branchId || '',
      });
      setSavingAccountNumber(customer.savingAccountNumber || '');
      setCurrentAccountNumber(customer.currentAccountNumber || '');
      setLoanAccountNumber(customer.loanAccountNumber || '');
      setSignature(customer.signature || '');
      setNominee({
        name: customer.nominee?.name || '',
        cnic: customer.nominee?.cnic || '',
        relation: customer.nominee?.relation || '',
        cnicImage: '',
      });
      setFiles([]);
      setExistingDocs(customer.documents || []);
      setDocsToDelete([]);
    }
  }, [customer, reset]);

  if (!customer) return null;

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
    toast.success(
      `${type === 'savingAccountNumber' ? 'Saving' : type === 'currentAccountNumber' ? 'Current' : 'Loan'} number generated`,
    );
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = [];
    const totalCurrentFiles = existingDocs.length + files.length;
    if (totalCurrentFiles + selectedFiles.length > 5) {
      toast.error('Maximum 5 files allowed total');
      return;
    }
    selectedFiles.forEach((file) => {
      if (file.size > 1 * 1024 * 1024)
        toast.error(`${file.name} exceeds 1MB limit`);
      else validFiles.push(file);
    });
    if (validFiles.length > 0) setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const removeExistingFile = (docId) => {
    setExistingDocs((prev) => prev.filter((doc) => doc._id !== docId));
    setDocsToDelete((prev) => [...prev, docId]);
  };

  const handleNomineeImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('CNIC image exceeds 2MB limit');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () =>
        setNominee((prev) => ({ ...prev, cnicImage: reader.result }));
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
    try {
      if (docsToDelete.length > 0) {
        await Promise.all(
          docsToDelete.map((docId) =>
            api.delete(`/customers/${customer._id}/documents/${docId}`),
          ),
        );
      }

      const payload = {
        ...formData,
        name: formData.name.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        savingAccountNumber,
        currentAccountNumber,
        loanAccountNumber,
        signature,
        nominee,
      };
      await api.put(`/customers/${customer._id}`, payload);

      if (files.length > 0) {
        setUploading(true);
        const data = new FormData();
        files.forEach((file) => {
          data.append('documents', file);
        });
        await api.post(`/customers/${customer._id}/documents`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success('Customer profile updated');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update customer');
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
                <UserCircle />
              </div>
              <div className="min-w-0 flex-1 pr-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1.5">
                  Update profile
                </p>
                <DialogTitle>Update Profile</DialogTitle>
                <DialogDescription className="mt-1">
                  Modify details for{' '}
                  <span className="font-bold text-primary capitalize">
                    {customer?.name}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 pb-10 custom-scrollbar">
          <form
            id="edit-customer-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                    {...register('name', { required: 'Name is required' })}
                  />
                  {errors.name && (
                    <p className="text-rose-500 text-[10px] font-bold pl-1 mt-1 animate-in fade-in slide-in-from-top-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    CNIC Number
                  </label>
                  <Input
                    type="text"
                    placeholder="00000-0000000-0"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-extrabold tabular-nums focus:ring-2 focus:ring-primary/20 transition-all font-mono h-auto"
                    {...register('cnic', { required: 'CNIC is required' })}
                    onChange={(e) =>
                      setValue('cnic', formatCNIC(e.target.value))
                    }
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
                    Email Address
                  </label>
                  <Input
                    type="email"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
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
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                    {...register('phone', { required: 'Phone is required' })}
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
                  <Input
                    type="text"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                    {...register('job')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Monthly Income
                  </label>
                  <Input
                    type="number"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                    {...register('monthlyIncome')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                  Job Detail & Office Address
                </label>
                <Textarea
                  className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none"
                  {...register('jobDetail')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                  Residential Address
                </label>
                <Textarea
                  className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none"
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

              <AccountNumberGenerator
                saving={savingAccountNumber}
                current={currentAccountNumber}
                loan={loanAccountNumber}
                onGenerate={generateAccountNumber}
              />

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
                    <Input
                      type="text"
                      value={nominee.name}
                      onChange={(e) =>
                        setNominee({ ...nominee, name: e.target.value })
                      }
                      placeholder="Full name of nominee"
                      className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-amber-500/20 transition-all h-auto"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                      Nominee CNIC
                    </label>
                    <Input
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
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Relation to Customer
                  </label>
                  <Input
                    type="text"
                    value={nominee.relation}
                    onChange={(e) =>
                      setNominee({ ...nominee, relation: e.target.value })
                    }
                    placeholder="e.g. Spouse, Father, Son"
                    className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-amber-500/20 transition-all h-auto"
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

              {existingDocs.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Existing Documents
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {existingDocs.map((doc) => (
                      <div
                        key={doc._id}
                        className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]"
                      >
                        <span className="text-[10px] font-bold truncate pr-2 text-slate-900 dark:text-white">
                          {doc.originalName}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeExistingFile(doc._id)}
                          className="text-rose-500 hover:scale-110 transition-transform"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                  New Documents (Max 5 Total)
                </label>
                <div className="relative p-6 border-2 border-dashed border-slate-100 dark:border-white/[0.06] rounded-2xl bg-white dark:bg-white/[0.02] text-center hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500 mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Click or drag files
                  </p>
                </div>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-primary/10 text-primary"
                      >
                        <span className="text-[10px] font-bold truncate max-w-[100px]">
                          {file.name}
                        </span>
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-rose-500"
                          onClick={() => removeFile(idx)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex justify-between">
                  Signature <span>*</span>
                </label>
                {signature && signature.startsWith('http') && (
                  <div className="mb-2 p-2 bg-white rounded-2xl border border-slate-100 dark:border-white/[0.06] flex flex-col items-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">
                      Current Signature
                    </p>
                    <img
                      src={signature}
                      alt="Current Signature"
                      className="max-h-24 object-contain"
                    />
                  </div>
                )}
                <SignaturePad
                  onSave={(dataUrl) => setSignature(dataUrl)}
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
            form="edit-customer-form"
            type="submit"
            disabled={loading || uploading}
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
          >
            {loading || uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditCustomerModal;
