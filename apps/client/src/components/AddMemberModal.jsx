import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, UserPlus } from 'lucide-react';
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
  const user = (JSON.parse(localStorage.getItem('user') || '{}') || {});
  const [loading, setLoading] = useState(false);
  const [savingAccountNumber, setSavingAccountNumber] = useState('');
  const [currentAccountNumber, setCurrentAccountNumber] = useState('');
  const [loanAccountNumber, setLoanAccountNumber] = useState('');

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
      initialInvestment: '',
      profitRate: '',
    },
  });

  const handleOcrData = (data) => {
    if (data.name) setValue('name', data.name);
    if (data.cnic) setValue('cnic', data.cnic);
    if (data.email) setValue('email', data.email);
    if (data.phone) setValue('phone', data.phone);
  };

  const generateAccountNumber = (type = 'savingAccountNumber') => {
    const prefix = type === 'savingAccountNumber' ? 'SAV' : type === 'currentAccountNumber' ? 'CUR' : 'LON';
    const result = generateDynamicAccountNumber(user, prefix);
    if (type === 'savingAccountNumber') setSavingAccountNumber(result);
    else if (type === 'currentAccountNumber') setCurrentAccountNumber(result);
    else setLoanAccountNumber(result);
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
        initialInvestment: parseFloat(formData.initialInvestment) || 0,
        profitRate: parseFloat(formData.profitRate) || 0,
        savingAccountNumber: savingAccountNumber || undefined,
        currentAccountNumber: currentAccountNumber || undefined,
        loanAccountNumber: loanAccountNumber || undefined,
      });
      onSuccess();
      onClose();
      reset();
      setSavingAccountNumber('');
      setCurrentAccountNumber('');
      setLoanAccountNumber('');
    } catch (err) {
      setError('root', {
        message: err.response?.data?.message || 'Failed to add member',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[95vh] p-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 border-b bg-background z-10">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">
                  Add New Member
                </DialogTitle>
                <DialogDescription className="text-sm font-medium">
                  Onboard a new investor for profit distribution.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          {errors.root && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-2xl text-xs font-bold uppercase tracking-wider border border-destructive/20 mb-6 animate-in fade-in zoom-in-95">
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
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('cnic', { required: 'CNIC is required' })}
                    onChange={(e) => {
                      setValue('cnic', formatCNIC(e.target.value));
                    }}
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
                    placeholder="member@example.com"
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
                      className="w-full px-4 py-2 rounded-2xl border border-border/50 bg-background/50 text-xs font-black font-mono focus:outline-none"
                    />
                    {!savingAccountNumber && (
                      <Button
                        type="button"
                        onClick={() =>
                          generateAccountNumber('savingAccountNumber')
                        }
                        className="rounded-2xl px-3 py-2 text-[10px] h-9"
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
                      className="w-full px-4 py-2 rounded-2xl border border-border/50 bg-background/50 text-xs font-black font-mono focus:outline-none"
                    />
                    {!currentAccountNumber && (
                      <Button
                        type="button"
                        onClick={() =>
                          generateAccountNumber('currentAccountNumber')
                        }
                        className="rounded-2xl px-3 py-2 text-[10px] h-9"
                      >
                        Gen
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Loan Account
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={loanAccountNumber}
                      placeholder="Gen ->"
                      className="w-full px-4 py-2 rounded-2xl border border-border/50 bg-background/50 text-xs font-black font-mono focus:outline-none"
                    />
                    {!loanAccountNumber && (
                      <Button
                        type="button"
                        onClick={() =>
                          generateAccountNumber('loanAccountNumber')
                        }
                        className="rounded-2xl px-3 py-2 text-[10px] h-9"
                      >
                        Gen
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-3xl bg-muted/30 border border-border/50">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Initial Investment
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('initialInvestment')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Profit Rate (%)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('profitRate')}
                  />
                </div>
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
            form="add-member-form"
            type="submit"
            disabled={loading}
            variant="gradient"
            className="px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3"
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
