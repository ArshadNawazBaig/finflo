import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  FileText,
  Calculator,
  DollarSign,
  Clock,
  User,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

const MemberLoanRequestModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    defaultValues: {
      principal: '',
      duration: '',
      notes: '',
      grantor1Identifier: '',
      grantor2Identifier: '',
    },
  });

  const [defaultInterestRate, setDefaultInterestRate] = useState(0);

  const [grantor1Name, setGrantor1Name] = useState('');
  const [isLookingUp1, setIsLookingUp1] = useState(false);
  const [searchResults1, setSearchResults1] = useState([]);

  const [grantor2Name, setGrantor2Name] = useState('');
  const [isLookingUp2, setIsLookingUp2] = useState(false);
  const [searchResults2, setSearchResults2] = useState([]);
  const [currentMember, setCurrentMember] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, memberRes] = await Promise.all([
          api.get('/system-settings'),
          api.get('/member-auth/me'),
        ]);

        if (settingsRes.data && settingsRes.data.defaultInterestRate) {
          setDefaultInterestRate(settingsRes.data.defaultInterestRate);
        }
        setCurrentMember(memberRes.data);
      } catch (error) {
        console.error('Failed to fetch modal data:', error);
      }
    };
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const principal = watch('principal');
  const duration = watch('duration');
  const grantor1Identifier = watch('grantor1Identifier');
  const grantor2Identifier = watch('grantor2Identifier');
  const grantor1Backend = watch('grantor1IdentifierForBackend');
  const grantor2Backend = watch('grantor2IdentifierForBackend');

  useEffect(() => {
    const lookup1 = async () => {
      if (
        grantor1Identifier &&
        grantor1Identifier.length >= 3 &&
        !grantor1Backend &&
        grantor1Identifier !== grantor1Name
      ) {
        setIsLookingUp1(true);
        try {
          const { data } = await api.get(
            `/members/portal/lookup?identifier=${grantor1Identifier}`,
          );

          let filteredResults = currentMember
            ? data.filter((m) => m._id !== currentMember._id)
            : data;

          const g2Val = watch('grantor2Identifier');
          if (g2Val) {
            filteredResults = filteredResults.filter(
              (m) => m.cnic !== g2Val && m.phone !== g2Val && m.name !== g2Val,
            );
          }

          setSearchResults1(filteredResults);

          const normalize = (val) => val?.replace(/\D/g, '') || '';
          const targetDigits = normalize(grantor1Identifier);

          const exactMatch = filteredResults.find(
            (m) =>
              normalize(m.cnic) === targetDigits ||
              normalize(m.phone) === targetDigits,
          );

          if (exactMatch && targetDigits.length >= 11) {
            setGrantor1Name(exactMatch.name);
          } else {
            setGrantor1Name('');
          }
        } catch (error) {
          setSearchResults1([]);
          setGrantor1Name('');
        } finally {
          setIsLookingUp1(false);
        }
      } else if (!grantor1Backend) {
        setSearchResults1([]);
        setGrantor1Name('');
      } else {
        setSearchResults1([]);
      }
    };

    const debounce = setTimeout(() => {
      lookup1();
    }, 500);
    return () => clearTimeout(debounce);
  }, [
    grantor1Identifier,
    grantor1Backend,
    currentMember,
    watch('grantor2Identifier'),
    grantor2Backend,
  ]);

  useEffect(() => {
    const lookup2 = async () => {
      if (
        grantor2Identifier &&
        grantor2Identifier.length >= 3 &&
        !grantor2Backend &&
        grantor2Identifier !== grantor2Name
      ) {
        setIsLookingUp2(true);
        try {
          const { data } = await api.get(
            `/members/portal/lookup?identifier=${grantor2Identifier}`,
          );

          let filteredResults = currentMember
            ? data.filter((m) => m._id !== currentMember._id)
            : data;

          const g1Val = watch('grantor1Identifier');
          if (g1Val) {
            filteredResults = filteredResults.filter(
              (m) => m.cnic !== g1Val && m.phone !== g1Val && m.name !== g1Val,
            );
          }

          setSearchResults2(filteredResults);

          const normalize = (val) => val?.replace(/\D/g, '') || '';
          const targetDigits = normalize(grantor2Identifier);

          const exactMatch = filteredResults.find(
            (m) =>
              normalize(m.cnic) === targetDigits ||
              normalize(m.phone) === targetDigits,
          );

          if (exactMatch && targetDigits.length >= 11) {
            setGrantor2Name(exactMatch.name);
          } else {
            setGrantor2Name('');
          }
        } catch (error) {
          setSearchResults2([]);
          setGrantor2Name('');
        } finally {
          setIsLookingUp2(false);
        }
      } else if (!grantor2Backend) {
        setSearchResults2([]);
        setGrantor2Name('');
      } else {
        setSearchResults2([]);
      }
    };

    const debounce = setTimeout(() => {
      lookup2();
    }, 500);
    return () => clearTimeout(debounce);
  }, [
    grantor2Identifier,
    grantor2Backend,
    currentMember,
    watch('grantor1Identifier'),
    grantor1Backend,
  ]);

  const estimatedMonthlyPayment =
    principal && duration
      ? (() => {
          const p = Number(principal);
          const r = defaultInterestRate / 100;
          const n = Number(duration);
          const totalInterest = p * r * (n / 12);
          const totalAmount = p + totalInterest;
          return Math.round(totalAmount / n);
        })()
      : 0;

  const onSubmit = async (data) => {
    const g1Backend = watch('grantor1IdentifierForBackend');
    const g2Backend = watch('grantor2IdentifierForBackend');

    const payload = {
      ...data,
      rate: defaultInterestRate,
      grantor1Identifier: g1Backend || data.grantor1Identifier,
      grantor2Identifier: g2Backend || data.grantor2Identifier,
    };

    if (payload.grantor1Identifier === payload.grantor2Identifier) {
      setError('grantor2Identifier', {
        type: 'manual',
        message: 'Grantor 1 and Grantor 2 cannot be the same member.',
      });
      return;
    }

    setLoading(true);
    try {
      await api.post('/loans/request', payload);
      toast.success('Loan request submitted successfully!');
      reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Loan request failed', error);
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] !p-0 !gap-0 flex flex-col overflow-hidden rounded-[2.5rem] border-border/50 shadow-2xl">
        <DialogDescription className="sr-only">
          Fill out this form to request a new loan.
        </DialogDescription>

        {/* Fixed Header */}
        <div className="p-8 border-b bg-background z-10 shrink-0 relative">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shrink-0 shadow-inner">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-black leading-tight text-foreground truncate">
                Request Loan
              </DialogTitle>
              <p className="text-xs font-medium text-muted-foreground mt-1 truncate">
                Submit application for review
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-900/10">
          {currentMember && (
            <div className="mb-8 p-5 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 flex items-center justify-between group/eligible hover:bg-amber-500/10 transition-colors">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600/70">
                  Current Loan Eligibility
                </p>
                <p className="text-2xl font-black text-amber-600 tracking-tight">
                  {formatCurrency(currentMember.creditLimit || 0)}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 group-hover/eligible:scale-110 transition-transform shadow-inner">
                <ShieldCheck size={24} />
              </div>
            </div>
          )}

          <form
            id="loan-request-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <DollarSign className="w-3 h-3 text-emerald-500" /> Loan Amount
                (PKR)
              </label>
              <input
                type="number"
                {...register('principal', {
                  required: 'Amount is required',
                  min: { value: 1000, message: 'Minimum amount is 1000' },
                })}
                className="w-full px-5 py-3.5 rounded-2xl border border-border/50 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30 shadow-inner"
                placeholder="e.g. 50000"
              />
              {errors.principal && (
                <p className="text-[10px] text-destructive font-bold ml-1">
                  {errors.principal.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <Clock className="w-3 h-3 text-indigo-500" /> Duration (Months)
              </label>
              <Select
                onValueChange={(value) => {
                  setValue('duration', value);
                  clearErrors('duration');
                }}
              >
                <SelectTrigger className="w-full px-5 py-3.5 h-auto rounded-2xl border border-border/50 bg-background text-sm font-medium focus:ring-2 focus:ring-primary/20 shadow-inner">
                  <SelectValue placeholder="Select Duration" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  {[3, 6, 9, 12, 18, 24, 36].map((m) => (
                    <SelectItem
                      key={m}
                      value={m.toString()}
                      className="text-sm rounded-xl"
                    >
                      {m} Months
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.duration && (
                <p className="text-[10px] text-destructive font-bold ml-1">
                  {errors.duration.message}
                </p>
              )}
            </div>

            <div className="space-y-2 relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <User className="w-3 h-3 text-blue-500" /> Grantor 1
              </label>
              <div className="relative">
                <input
                  type="text"
                  {...register('grantor1Identifier', {
                    required: 'Grantor 1 information is required',
                    onChange: () => {
                      setValue('grantor1IdentifierForBackend', '');
                      setGrantor1Name('');
                    },
                  })}
                  autoComplete="off"
                  className="w-full px-5 py-3.5 rounded-2xl border border-border/50 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30 capitalize shadow-inner"
                  placeholder="Search for Member"
                />
                {isLookingUp1 && searchResults1.length === 0 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2
                      size={14}
                      className="animate-spin text-primary opacity-50"
                    />
                  </div>
                )}
                {searchResults1.length > 0 && !grantor1Name && (
                  <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-2 rounded-[1.8rem] bg-card border border-border/50 shadow-2xl space-y-1 backdrop-blur-xl">
                    {searchResults1.map((member) => (
                      <button
                        key={member._id}
                        type="button"
                        onClick={() => {
                          setValue('grantor1Identifier', member.name);
                          setValue(
                            'grantor1IdentifierForBackend',
                            member.cnic || member.phone,
                          );
                          setGrantor1Name(member.name);
                          setSearchResults1([]);
                          clearErrors('grantor1Identifier');
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted text-left transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-inner">
                            <User size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-black tracking-tight capitalize">
                              {member.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium">
                              {member.cnic || member.phone}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {grantor1Name && (
                  <div className="mx-1 mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                    <ShieldCheck size={12} className="shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                      Verified: {grantor1Name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <User className="w-3 h-3 text-blue-500" /> Grantor 2
              </label>
              <div className="relative">
                <input
                  type="text"
                  {...register('grantor2Identifier', {
                    required: 'Grantor 2 information is required',
                    validate: (value) =>
                      value !== grantor1Identifier ||
                      'Grantors must be different',
                    onChange: () => {
                      setValue('grantor2IdentifierForBackend', '');
                      setGrantor2Name('');
                    },
                  })}
                  autoComplete="off"
                  className="w-full px-5 py-3.5 rounded-2xl border border-border/50 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30 capitalize shadow-inner"
                  placeholder="Search for Member"
                />
                {isLookingUp2 && searchResults2.length === 0 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2
                      size={14}
                      className="animate-spin text-primary opacity-50"
                    />
                  </div>
                )}
                {searchResults2.length > 0 && !grantor2Name && (
                  <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-2 rounded-[1.8rem] bg-card border border-border/50 shadow-2xl space-y-1 backdrop-blur-xl">
                    {searchResults2.map((member) => (
                      <button
                        key={member._id}
                        type="button"
                        onClick={() => {
                          setValue('grantor2Identifier', member.name);
                          setValue(
                            'grantor2IdentifierForBackend',
                            member.cnic || member.phone,
                          );
                          setGrantor2Name(member.name);
                          setSearchResults2([]);
                          clearErrors('grantor2Identifier');
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted text-left transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-inner">
                            <User size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-black capitalize tracking-tight">
                              {member.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium">
                              {member.cnic || member.phone}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {grantor2Name && (
                  <div className="mx-1 mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                    <ShieldCheck size={12} className="shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                      Verified: {grantor2Name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Purpose / Notes (Optional)
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-5 py-3.5 rounded-2xl border border-border/50 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground/30 shadow-inner"
                placeholder="Briefly describe why you need this loan..."
              />
            </div>

            {principal && duration && (
              <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-6 flex items-center gap-5 group/estimate hover:bg-primary/10 transition-all">
                <div className="p-4 bg-primary/10 rounded-2xl text-primary shrink-0 transition-transform shadow-inner">
                  <Calculator size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Estimated Monthly Payment
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <p className="text-2xl font-black text-foreground tracking-tight">
                      PKR {Number(estimatedMonthlyPayment).toLocaleString()}
                    </p>
                    <span className="text-xs font-bold text-muted-foreground opacity-60">
                      /mo
                    </span>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="p-8 border-t bg-background z-10 shrink-0 flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-muted transition-all rounded-2xl border border-transparent hover:border-border/50 active:scale-95"
          >
            Cancel
          </button>
          <Button
            form="loan-request-form"
            type="submit"
            isLoading={loading}
            variant="gradient"
            className="flex-[2] h-12 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
          >
            Submit Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberLoanRequestModal;
