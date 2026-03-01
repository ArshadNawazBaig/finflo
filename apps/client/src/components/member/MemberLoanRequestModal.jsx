import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import {
  X,
  Loader2,
  FileText,
  Calculator,
  DollarSign,
  Clock,
  User,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [isFocused1, setIsFocused1] = useState(false);
  const [searchResults1, setSearchResults1] = useState([]);

  const [grantor2Name, setGrantor2Name] = useState('');
  const [isLookingUp2, setIsLookingUp2] = useState(false);
  const [isFocused2, setIsFocused2] = useState(false);
  const [searchResults2, setSearchResults2] = useState([]);
  const [currentMember, setCurrentMember] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, memberRes] = await Promise.all([
          api.get('/system-settings'),
          api.get('/member-auth/me', {
            headers: {
              /* Auth header handled by browser cookies */
            },
          }),
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

  // Auto-lookup grantor 1
  useEffect(() => {
    const lookup1 = async () => {
      // Only lookup if the input doesn't match the already selected name
      if (
        grantor1Identifier &&
        grantor1Identifier.length >= 3 &&
        !grantor1Backend &&
        grantor1Identifier !== grantor1Name
      ) {
        setIsLookingUp1(true);
        try {
          const memberToken = localStorage.getItem('member');
          const { data } = await api.get(
            `/members/portal/lookup?identifier=${grantor1Identifier}`,
            {
              headers: {
                /* Auth header handled by browser cookies */
              },
            },
          );

          // Filter out current member
          let filteredResults = currentMember
            ? data.filter((m) => m._id !== currentMember._id)
            : data;

          // Filter out Grantor 2 if already typed/selected
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

  // Auto-lookup grantor 2
  useEffect(() => {
    const lookup2 = async () => {
      // Only lookup if the input doesn't match the already selected name
      if (
        grantor2Identifier &&
        grantor2Identifier.length >= 3 &&
        !grantor2Backend &&
        grantor2Identifier !== grantor2Name
      ) {
        setIsLookingUp2(true);
        try {
          const memberToken = localStorage.getItem('member');
          const { data } = await api.get(
            `/members/portal/lookup?identifier=${grantor2Identifier}`,
            {
              headers: {
                /* Auth header handled by browser cookies */
              },
            },
          );

          // Filter out current member
          let filteredResults = currentMember
            ? data.filter((m) => m._id !== currentMember._id)
            : data;

          // Filter out Grantor 1 if already typed/selected
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

  // Flat Interest Calculation
  const estimatedMonthlyPayment =
    principal && duration
      ? (() => {
          const p = Number(principal);
          const r = defaultInterestRate / 100; // Annual rate
          const n = Number(duration);

          // Flat interest: Total Interest = Principal × Rate × Time
          const totalInterest = p * r * (n / 12); // Convert months to years
          const totalAmount = p + totalInterest;
          const monthlyPayment = totalAmount / n;

          return Math.round(monthlyPayment);
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
      const memberToken = localStorage.getItem('member');
      await api.post('/loans/request', payload, {
        headers: {
          /* Auth header handled by browser cookies */
        },
      });
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
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[200]"
        onClose={onClose}
        aria-describedby="loan-request-description"
      >
        <p id="loan-request-description" className="sr-only">
          Fill out this form to request a new loan. You will need to provide the
          amount, duration, and a grantor.
        </p>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-visible rounded-[2rem] bg-card border border-border/50 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="div" className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black leading-6 text-foreground">
                        Request Loan
                      </h3>
                      <p className="text-xs font-medium text-muted-foreground mt-1">
                        Submit application for review
                      </p>
                    </div>
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {currentMember && (
                  <div className="mb-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/70">
                        Current Loan Eligibility
                      </p>
                      <p className="text-lg font-black text-amber-600">
                        {formatCurrency(currentMember.creditLimit || 0)}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                      <ShieldCheck size={20} />
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-1.5">
                      <DollarSign className="w-2.5 h-2.5 text-emerald-500" />{' '}
                      Loan Amount (PKR)
                    </label>
                    <input
                      type="number"
                      {...register('principal', {
                        required: 'Amount is required',
                        min: { value: 1000, message: 'Minimum amount is 1000' },
                      })}
                      className="w-full px-3 py-2.5 rounded-xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                      placeholder="e.g. 50000"
                    />
                    {errors.principal && (
                      <p className="text-[10px] text-destructive font-bold ml-1">
                        {errors.principal.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-1.5">
                      <Clock className="w-2.5 h-2.5 text-indigo-500" /> Duration
                      (Months)
                    </label>
                    <Select
                      onValueChange={(value) => {
                        setValue('duration', value);
                        clearErrors('duration');
                      }}
                    >
                      <SelectTrigger className="w-full px-3 py-2.5 h-auto rounded-xl border border-border/50 bg-background/50 text-sm font-medium focus:ring-2 focus:ring-primary/20">
                        <SelectValue placeholder="Select Duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {[3, 6, 9, 12, 18, 24, 36].map((m) => (
                          <SelectItem
                            key={m}
                            value={m.toString()}
                            className="text-sm"
                          >
                            {m} Months
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Hidden input for validation if needed, or rely on manual validation */}
                    <input
                      type="hidden"
                      {...register('duration', {
                        required: 'Duration is required',
                      })}
                    />

                    {errors.duration && (
                      <p className="text-[10px] text-destructive font-bold ml-1">
                        {errors.duration.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                      <User className="w-3 h-3 text-blue-500" /> Grantor 1
                      (Member Name, CNIC or Phone)
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
                        onFocus={() => {
                          setIsFocused1(true);
                          setSearchResults2([]);
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setIsFocused1(false);
                            setSearchResults1([]);
                          }, 200);
                        }}
                        autoComplete="off"
                        className="w-full px-3 py-2.5 rounded-xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30 capitalize"
                        placeholder="Search by Name, CNIC, or Phone"
                      />
                      {isLookingUp1 && searchResults1.length === 0 && (
                        <p className="text-[9px] text-muted-foreground ml-1 flex items-center gap-1.5 animate-pulse absolute -bottom-4 left-0">
                          <Loader2 size={10} className="animate-spin" />{' '}
                          Searching...
                        </p>
                      )}

                      {searchResults1.length > 0 && !grantor1Name && (
                        <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-2 rounded-2xl bg-card border border-border/50 shadow-2xl space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                          {searchResults1.map((member) => (
                            <button
                              key={member._id}
                              type="button"
                              onClick={() => {
                                // Add a small delay to selection to show the click
                                setValue('grantor1Identifier', member.name);
                                setValue(
                                  'grantor1IdentifierForBackend',
                                  member.cnic || member.phone,
                                );
                                setGrantor1Name(member.name);
                                setTimeout(() => setSearchResults1([]), 100);
                                clearErrors('grantor1Identifier');
                              }}
                              className={`w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted text-left transition-colors group ${
                                (() => {
                                  const norm = (v) =>
                                    v?.replace(/\D/g, '') || '';
                                  return (
                                    norm(member.cnic) ===
                                      norm(grantor1Identifier) ||
                                    norm(member.phone) ===
                                      norm(grantor1Identifier)
                                  );
                                })()
                                  ? 'bg-primary/5 border border-primary/20'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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

                      {!isLookingUp1 &&
                        isFocused1 &&
                        grantor1Identifier &&
                        grantor1Identifier.length >= 3 &&
                        searchResults1.length === 0 &&
                        !grantor1Name && (
                          <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-4 rounded-2xl bg-card border border-border/50 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex flex-col items-center justify-center gap-2 py-2">
                              <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                                <X size={16} />
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                No Member Found
                              </p>
                              <p className="text-[9px] text-muted-foreground font-medium text-center px-4">
                                No member matches "{grantor1Identifier}"
                              </p>
                            </div>
                          </div>
                        )}

                      {grantor1Name && (
                        <div className="mx-1 mt-1 flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 animate-in fade-in zoom-in-95">
                          <User size={10} className="shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-tighter">
                            Verified: {grantor1Name}
                          </span>
                        </div>
                      )}
                    </div>
                    {errors.grantor1Identifier && (
                      <p className="text-[10px] text-destructive font-bold ml-1">
                        {errors.grantor1Identifier.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                      <User className="w-3 h-3 text-blue-500" /> Grantor 2
                      (Member Name, CNIC or Phone)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        {...register('grantor2Identifier', {
                          required: 'Grantor 2 information is required',
                          validate: (value) =>
                            value !== grantor1Identifier ||
                            'Grantor 1 and Grantor 2 cannot be the same member.',
                          onChange: () => {
                            setValue('grantor2IdentifierForBackend', '');
                            setGrantor2Name('');
                          },
                        })}
                        onFocus={() => {
                          setIsFocused2(true);
                          setSearchResults1([]);
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setIsFocused2(false);
                            setSearchResults2([]);
                          }, 200);
                        }}
                        autoComplete="off"
                        className="w-full px-3 py-2.5 rounded-xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30 capitalize"
                        placeholder="Search by Name, CNIC, or Phone"
                      />
                      {isLookingUp2 && searchResults2.length === 0 && (
                        <p className="text-[9px] text-muted-foreground ml-1 flex items-center gap-1.5 animate-pulse absolute -bottom-4 left-0">
                          <Loader2 size={10} className="animate-spin" />{' '}
                          Searching...
                        </p>
                      )}

                      {searchResults2.length > 0 && !grantor2Name && (
                        <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-2 rounded-2xl bg-card border border-border/50 shadow-2xl space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
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
                                setTimeout(() => setSearchResults2([]), 100);
                                clearErrors('grantor2Identifier');
                              }}
                              className={`w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted text-left transition-colors group ${
                                (() => {
                                  const norm = (v) =>
                                    v?.replace(/\D/g, '') || '';
                                  return (
                                    norm(member.cnic) ===
                                      norm(grantor2Identifier) ||
                                    norm(member.phone) ===
                                      norm(grantor2Identifier)
                                  );
                                })()
                                  ? 'bg-primary/5 border border-primary/20'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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

                      {!isLookingUp2 &&
                        isFocused2 &&
                        grantor2Identifier &&
                        grantor2Identifier.length >= 3 &&
                        searchResults2.length === 0 &&
                        !grantor2Name && (
                          <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-4 rounded-2xl bg-card border border-border/50 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex flex-col items-center justify-center gap-2 py-2">
                              <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                                <X size={16} />
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                No Member Found
                              </p>
                              <p className="text-[9px] text-muted-foreground font-medium text-center px-4">
                                No member matches "{grantor2Identifier}"
                              </p>
                            </div>
                          </div>
                        )}

                      {grantor2Name && (
                        <div className="mx-1 mt-1 flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 animate-in fade-in zoom-in-95">
                          <User size={10} className="shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-tighter">
                            Verified: {grantor2Name}
                          </span>
                        </div>
                      )}
                    </div>
                    {errors.grantor2Identifier && (
                      <p className="text-[10px] text-destructive font-bold ml-1">
                        {errors.grantor2Identifier.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">
                      Purpose / Notes
                    </label>
                    <textarea
                      {...register('notes')}
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground/30"
                      placeholder="Briefly describe why you need this loan..."
                    />
                  </div>

                  {/* Estimate Box */}
                  {principal && duration && (
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-2xl text-primary shrink-0">
                        <Calculator size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Estimated Monthly Payment
                        </p>
                        <p className="text-lg font-black text-foreground mt-0.5">
                          PKR {Number(estimatedMonthlyPayment).toLocaleString()}{' '}
                          <span className="text-xs font-medium text-muted-foreground">
                            /mo
                          </span>
                        </p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1 opacity-70">
                          *Final terms set by admin
                        </p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5 opacity-70">
                          Based on {defaultInterestRate}% annual flat interest
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex gap-2 border-t border-border/50 mt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      isLoading={loading}
                      variant="gradient"
                      className="flex-1 rounded-full py-4 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                    >
                      Submit Request
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default MemberLoanRequestModal;
