import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { toast } from 'sonner';
import {
  formatCNIC,
  validateEmail,
  generateDynamicAccountNumber,
} from '@/lib/utils';

import KycOcrScanner from '../kyc/KycOcrScanner';

const AddCustomerModal = ({ isOpen, onClose, onSuccess }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
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
        <div className="p-6 border-b bg-background z-10">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">
                  Add New Customer
                </DialogTitle>
                <DialogDescription className="text-sm font-medium">
                  Register a new customer to the system.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-10 custom-scrollbar">
          {errors.root && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-2xl text-xs font-bold uppercase tracking-wider border border-destructive/20 mb-6 animate-in fade-in zoom-in-95">
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
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter name"
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('name', { required: 'Full name is required' })}
                  />
                  {errors.name && (
                    <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    CNIC Number *
                  </label>
                  <input
                    type="text"
                    placeholder="00000-0000000-0"
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                    {...register('cnic', { required: 'CNIC is required' })}
                    onChange={(e) =>
                      setValue('cnic', formatCNIC(e.target.value))
                    }
                  />
                  {errors.cnic && (
                    <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                      {errors.cnic.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('email', { required: 'Email is required' })}
                  />
                  {errors.email && (
                    <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="+92 300 1234567"
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('phone', {
                      required: 'Phone number is required',
                    })}
                  />
                  {errors.phone && (
                    <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Business"
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('job')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Monthly Income
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('monthlyIncome')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                  Job Detail & Office Address
                </label>
                <textarea
                  placeholder="Details of job and office location..."
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none"
                  {...register('jobDetail')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                  Residential Address
                </label>
                <textarea
                  placeholder="Enter complete address..."
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none"
                  {...register('address')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                  Branch Selection
                </label>
                {user.role === 'staff' ? (
                  <div className="w-full px-4 py-3 rounded-2xl bg-muted/30 text-xs font-bold text-muted-foreground italic border border-border/50">
                    Assigned to your branch
                  </div>
                ) : (
                  <select
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
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
                  <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.branchId.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-3xl bg-muted/30 border border-border/50">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Saving Account
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={savingAccountNumber}
                      placeholder="Gen ->"
                      className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black font-mono focus:outline-none"
                    />
                    {!savingAccountNumber && (
                      <Button
                        type="button"
                        onClick={() =>
                          generateAccountNumber('savingAccountNumber')
                        }
                        className="rounded-2xl px-4 py-3"
                      >
                        Gen
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Current Account
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={currentAccountNumber}
                      placeholder="Gen ->"
                      className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black font-mono focus:outline-none"
                    />
                    {!currentAccountNumber && (
                      <Button
                        type="button"
                        onClick={() =>
                          generateAccountNumber('currentAccountNumber')
                        }
                        className="rounded-2xl px-4 py-3"
                      >
                        Gen
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Nominee */}
              <div className="space-y-3 p-4 rounded-3xl bg-amber-500/5 border border-amber-500/20">
                <label className="text-[10px] font-black uppercase tracking-widest text-amber-600 px-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />{' '}
                  Nominee Information
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                      Nominee Name
                    </label>
                    <input
                      type="text"
                      value={nominee.name}
                      onChange={(e) =>
                        setNominee({ ...nominee, name: e.target.value })
                      }
                      placeholder="Full name of nominee"
                      className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
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
                      className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Relation to Customer
                  </label>
                  <input
                    type="text"
                    value={nominee.relation}
                    onChange={(e) =>
                      setNominee({ ...nominee, relation: e.target.value })
                    }
                    placeholder="e.g. Spouse, Father, Son"
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Nominee CNIC Image
                  </label>
                  <div className="flex flex-col gap-3">
                    {nominee.cnicImage && (
                      <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-border/50 bg-white shadow-sm flex items-center justify-center p-2">
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
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-white hover:scale-110 transition-transform shadow-lg"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <div className="relative group p-4 border-2 border-dashed border-border/50 rounded-[1.5rem] bg-background/50 text-center hover:bg-muted/10 transition-all overflow-hidden">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleNomineeImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex flex-col items-center gap-1">
                        <Upload
                          size={16}
                          className="text-muted-foreground group-hover:text-amber-500 transition-colors"
                        />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
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
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
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
        <div className="p-6 border-t bg-background z-10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
          >
            Cancel
          </button>
          <Button
            form="add-customer-form"
            type="submit"
            disabled={loading || uploading}
            variant="gradient"
            className="px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3"
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
