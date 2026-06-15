/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAtomValue } from 'jotai';
import SignaturePad from '@/components/ui/SignaturePad';
import FormField from '@/components/ui/FormField';
import { validateEmail, generateDynamicAccountNumber } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { userAtom } from '@/atoms';
import KycOcrScanner from './kyc/KycOcrScanner';
import MemberBasicInfoFields from './members/MemberBasicInfoFields';
import MemberEmploymentFields from './members/MemberEmploymentFields';
import MemberBranchSelector from './members/MemberBranchSelector';
import AccountNumberGenerator from './members/AccountNumberGenerator';
import MemberInvestmentFields from './members/MemberInvestmentFields';
import NomineeSection from './members/NomineeSection';

const EMPTY_NOMINEE = { name: '', cnic: '', relation: '', cnicImage: '' };

/**
 * Member onboarding modal — thin orchestrator. Owns the react-hook-form
 * instance, the non-RHF state (account numbers, signature, nominee), the
 * branch fetch, and the submit handler; delegates the actual fields to the
 * sub-components under `components/members/`.
 */
const AddMemberModal = ({ isOpen, onClose, onSuccess }) => {
  const user = useAtomValue(userAtom) || {};
  const [loading, setLoading] = useState(false);
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [branches, setBranches] = useState([]);
  const [savingAccountNumber, setSavingAccountNumber] = useState('');
  const [currentAccountNumber, setCurrentAccountNumber] = useState('');
  const [loanAccountNumber, setLoanAccountNumber] = useState('');
  const [signature, setSignature] = useState('');
  const [nominee, setNominee] = useState(EMPTY_NOMINEE);

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
  }, [isOpen, user.role, user.branchId, setValue]);

  // Pre-select the tenant's default branch once the options have rendered, so new
  // members land there unless the admin explicitly picks another.
  useEffect(() => {
    if (user.role !== 'staff' && branches.length > 0) {
      const defaultBranch = branches.find((b) => b.isDefault) || branches[0];
      if (defaultBranch) setValue('branchId', defaultBranch._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches]);

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
      setNominee(EMPTY_NOMINEE);
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
              <MemberBasicInfoFields
                register={register}
                errors={errors}
                setValue={setValue}
              />
              <MemberEmploymentFields register={register} />
              <MemberBranchSelector
                user={user}
                register={register}
                branches={branches}
                fetchingBranches={fetchingBranches}
                errors={errors}
              />
              <AccountNumberGenerator
                saving={savingAccountNumber}
                current={currentAccountNumber}
                loan={loanAccountNumber}
                onGenerate={generateAccountNumber}
              />
              <MemberInvestmentFields register={register} />
              <NomineeSection
                nominee={nominee}
                setNominee={setNominee}
                onImageChange={handleNomineeImageChange}
              />

              <FormField label="Signature" required>
                <SignaturePad
                  onSave={(data) => setSignature(data)}
                  onClear={() => setSignature('')}
                />
              </FormField>
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
            form="add-member-form"
            type="submit"
            disabled={
              loading ||
              (user.role !== 'staff' && !fetchingBranches && branches.length === 0)
            }
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
