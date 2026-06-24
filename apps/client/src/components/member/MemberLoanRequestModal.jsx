import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  FileText,
  Calculator,
  DollarSign,
  Clock,
  User,
  ShieldCheck,
  Upload,
  X,
  File,
  Image,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchResultsMenu from '@/components/ui/SearchResultsMenu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FormField from '@/components/ui/FormField';
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
import { formatCurrency, capitalize, cn } from '@/lib/utils';

const STEPS = [
  { id: 1, label: 'Loan Details', icon: DollarSign },
  { id: 2, label: 'Guarantors', icon: User },
  { id: 3, label: 'Documents', icon: Upload },
];

const DOC_TYPES = [
  'Pay Slip',
  'Business Registration',
  'Collateral Photo',
  'Bank Statement',
  'ID Card (CNIC)',
  'Other',
];

const MemberLoanRequestModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    clearErrors,
    getValues,
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
  const [g1BackendId, setG1BackendId] = useState('');
  const [g2BackendId, setG2BackendId] = useState('');
  // Anchors for the (portalled) search dropdowns so they float free of the
  // modal's scroll/overflow instead of being clipped behind the footer.
  const grantor1Ref = useRef(null);
  const grantor2Ref = useRef(null);
  // Closed-by-outside-click flag per grantor (results can still be in state).
  const [g1Dismissed, setG1Dismissed] = useState(false);
  const [g2Dismissed, setG2Dismissed] = useState(false);

  // Document upload state
  const [files, setFiles] = useState([]); // { file, type, preview }
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, memberRes] = await Promise.all([
          api.get('/system-settings'),
          api.get('/member-auth/me'),
        ]);
        if (settingsRes.data?.defaultInterestRate) {
          setDefaultInterestRate(settingsRes.data.defaultInterestRate);
        }
        setCurrentMember(memberRes.data);
      } catch (error) {
        console.error('Failed to fetch modal data:', error);
      }
    };
    if (isOpen) {
      fetchData();
      setStep(1);
      setFiles([]);
      setG1BackendId('');
      setG2BackendId('');
      setGrantor1Name('');
      setGrantor2Name('');
      setG1Dismissed(false);
      setG2Dismissed(false);
    }
  }, [isOpen]);

  const principal = watch('principal');
  const duration = watch('duration');
  const grantor1Identifier = watch('grantor1Identifier');
  const grantor2Identifier = watch('grantor2Identifier');

  // Grantor 1 lookup
  useEffect(() => {
    const lookup = async () => {
      if (
        grantor1Identifier &&
        grantor1Identifier.length >= 3 &&
        !g1BackendId &&
        grantor1Identifier !== grantor1Name
      ) {
        setIsLookingUp1(true);
        try {
          const { data } = await api.get(
            `/members/portal/lookup?identifier=${grantor1Identifier}`,
          );
          let filtered = currentMember
            ? data.filter((m) => m._id !== currentMember._id)
            : data;
          const g2Val = watch('grantor2Identifier');
          if (g2Val)
            filtered = filtered.filter(
              (m) => m.cnic !== g2Val && m.phone !== g2Val && m.name !== g2Val,
            );
          setSearchResults1(filtered);
          const normalize = (val) => val?.replace(/\D/g, '') || '';
          const target = normalize(grantor1Identifier);
          const exact = filtered.find(
            (m) =>
              normalize(m.cnic) === target || normalize(m.phone) === target,
          );
          setGrantor1Name(exact && target.length >= 11 ? exact.name : '');
        } catch {
          setSearchResults1([]);
          setGrantor1Name('');
        } finally {
          setIsLookingUp1(false);
        }
      } else if (!g1BackendId) {
        setSearchResults1([]);
        setGrantor1Name('');
      } else {
        setSearchResults1([]);
      }
    };
    const t = setTimeout(lookup, 500);
    return () => clearTimeout(t);
  }, [
    grantor1Identifier,
    g1BackendId,
    currentMember,
    watch('grantor2Identifier'),
    g2BackendId,
  ]);

  // Grantor 2 lookup
  useEffect(() => {
    const lookup = async () => {
      if (
        grantor2Identifier &&
        grantor2Identifier.length >= 3 &&
        !g2BackendId &&
        grantor2Identifier !== grantor2Name
      ) {
        setIsLookingUp2(true);
        try {
          const { data } = await api.get(
            `/members/portal/lookup?identifier=${grantor2Identifier}`,
          );
          let filtered = currentMember
            ? data.filter((m) => m._id !== currentMember._id)
            : data;
          const g1Val = watch('grantor1Identifier');
          if (g1Val)
            filtered = filtered.filter(
              (m) => m.cnic !== g1Val && m.phone !== g1Val && m.name !== g1Val,
            );
          setSearchResults2(filtered);
          const normalize = (val) => val?.replace(/\D/g, '') || '';
          const target = normalize(grantor2Identifier);
          const exact = filtered.find(
            (m) =>
              normalize(m.cnic) === target || normalize(m.phone) === target,
          );
          setGrantor2Name(exact && target.length >= 11 ? exact.name : '');
        } catch {
          setSearchResults2([]);
          setGrantor2Name('');
        } finally {
          setIsLookingUp2(false);
        }
      } else if (!g2BackendId) {
        setSearchResults2([]);
        setGrantor2Name('');
      } else {
        setSearchResults2([]);
      }
    };
    const t = setTimeout(lookup, 500);
    return () => clearTimeout(t);
  }, [
    grantor2Identifier,
    g2BackendId,
    currentMember,
    watch('grantor1Identifier'),
    g1BackendId,
  ]);

  const estimatedMonthlyPayment =
    principal && duration
      ? (() => {
          const p = Number(principal);
          const r = defaultInterestRate / 100;
          const n = Number(duration);
          const totalInterest = p * r * (n / 12);
          return Math.round((p + totalInterest) / n);
        })()
      : 0;

  // File handling
  const addFiles = useCallback(
    (newFiles) => {
      const remaining = 5 - files.length;
      if (remaining <= 0) return toast.error('Maximum 5 documents allowed');
      const toAdd = Array.from(newFiles).slice(0, remaining);
      const mapped = toAdd.map((f) => ({
        file: f,
        type: 'Other',
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      }));
      setFiles((prev) => [...prev, ...mapped]);
    },
    [files.length],
  );

  const removeFile = (idx) => {
    setFiles((prev) => {
      const removed = prev[idx];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const updateFileType = (idx, type) => {
    setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, type } : f)));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // Step validation
  const canProceed = () => {
    if (step === 1) return principal && duration && Number(principal) >= 1000;
    if (step === 2) return grantor1Name && grantor2Name;
    return true;
  };

  const onSubmit = async () => {
    const allValues = getValues();
    const payload = {
      principal: allValues.principal,
      duration: allValues.duration,
      notes: allValues.notes,
      rate: defaultInterestRate,
      grantor1Identifier: g1BackendId || allValues.grantor1Identifier,
      grantor2Identifier: g2BackendId || allValues.grantor2Identifier,
    };

    if (payload.grantor1Identifier === payload.grantor2Identifier) {
      setError('grantor2Identifier', {
        type: 'manual',
        message: 'Grantor 1 and Grantor 2 cannot be the same member.',
      });
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('principal', payload.principal);
      formData.append('duration', payload.duration);
      formData.append('rate', payload.rate);
      formData.append('notes', payload.notes || '');
      formData.append('grantor1Identifier', payload.grantor1Identifier);
      formData.append('grantor2Identifier', payload.grantor2Identifier);

      if (files.length > 0) {
        const docTypes = files.map((f) => f.type);
        formData.append('documentTypes', JSON.stringify(docTypes));
        files.forEach((f) => formData.append('documents', f.file));
      }

      await api.post('/loans/request', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Loan request submitted successfully!');
      reset();
      setFiles([]);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const renderGrantorSearch = (num) => {
    const identifier = num === 1 ? grantor1Identifier : grantor2Identifier;
    const name = num === 1 ? grantor1Name : grantor2Name;
    const isLooking = num === 1 ? isLookingUp1 : isLookingUp2;
    const results = num === 1 ? searchResults1 : searchResults2;
    const fieldName = `grantor${num}Identifier`;
    const backendField = num === 1 ? 'g1BackendId' : 'g2BackendId';
    const setBackendId = num === 1 ? setG1BackendId : setG2BackendId;
    const setName = num === 1 ? setGrantor1Name : setGrantor2Name;
    const setResults = num === 1 ? setSearchResults1 : setSearchResults2;
    const wrapperRef = num === 1 ? grantor1Ref : grantor2Ref;
    const dismissed = num === 1 ? g1Dismissed : g2Dismissed;
    const setDismissed = num === 1 ? setG1Dismissed : setG2Dismissed;

    return (
      <FormField
        className="relative"
        label={
          <>
            <User className="w-3 h-3 text-blue-500" /> Grantor {num}
          </>
        }
        htmlFor={fieldName}
        labelClassName="normal-case tracking-normal px-0 text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2"
        error={errors[fieldName]?.message}
      >
        <div className="relative" ref={wrapperRef}>
          <Input
            id={fieldName}
            type="text"
            {...register(fieldName, {
              required: `Grantor ${num} is required`,
              onChange: () => {
                setBackendId('');
                setName('');
                setDismissed(false);
              },
            })}
            onFocus={() => setDismissed(false)}
            autoComplete="off"
            className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 h-auto"
            placeholder="Search by name, CNIC or phone"
          />
          <SearchResultsMenu
            open={
              !name &&
              !dismissed &&
              (isLooking ||
                results.length > 0 ||
                (watch(fieldName)?.length || 0) >= 3)
            }
            loading={isLooking}
            results={name ? [] : results}
            onSelect={(member) => {
              setValue(fieldName, member.name);
              setBackendId(member._id);
              setName(member.name);
              setResults([]);
              clearErrors(fieldName);
            }}
            getKey={(m) => m._id}
            getTitle={(m) => capitalize(m.name)}
            getSubtitle={(m) => m.cnic || m.phone}
            renderLeading={() => (
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <User size={16} />
              </div>
            )}
            emptyMessage={`No member matches "${watch(fieldName) || ''}"`}
            anchorRef={wrapperRef}
            onDismiss={() => setDismissed(true)}
          />
          {name && (
            <div className="mx-1 mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
              <ShieldCheck size={12} className="shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-tighter">
                Verified: {capitalize(name)}
              </span>
            </div>
          )}
        </div>
      </FormField>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md !p-0 !gap-0 flex flex-col overflow-hidden">
        <DialogDescription className="sr-only">
          Multi-step loan application form.
        </DialogDescription>

        {/* Header with step indicator */}
        <div className="p-6 sm:p-7 pb-5 border-b border-slate-100 dark:border-white/[0.06] bg-white dark:bg-slate-950 z-10 shrink-0 relative">
          <div className="flex items-start gap-3 mb-5 pr-8">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
              <FileText />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1.5">
                Loan application
              </p>
              <DialogTitle>Request Loan</DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Step {step} of 3 — {STEPS[step - 1].label}
              </p>
            </div>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-xs font-extrabold transition-all duration-300 shrink-0',
                    step > s.id
                      ? 'bg-emerald-500 text-white'
                      : step === s.id
                        ? 'bg-primary text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)]'
                        : 'bg-slate-100 dark:bg-white/[0.05] text-slate-400 dark:text-slate-500',
                  )}
                >
                  {step > s.id ? <Check size={14} /> : s.id}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300',
                      step > s.id
                        ? 'bg-emerald-500'
                        : 'bg-slate-100 dark:bg-white/[0.06]',
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 custom-scrollbar">
          <form
            id="loan-request-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            {/* Step 1: Loan Details */}
            {step === 1 && (
              <>
                {currentMember && (
                  <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 flex items-center justify-between hover:bg-amber-500/10 transition-colors">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400">
                        Current Loan Eligibility
                      </p>
                      <p className="text-2xl font-extrabold tracking-tight tabular-nums text-amber-600 dark:text-amber-400">
                        {formatCurrency(currentMember.creditLimit || 0)}
                      </p>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center [&_svg]:w-4 [&_svg]:h-4">
                      <ShieldCheck />
                    </div>
                  </div>
                )}

                <FormField
                  label={
                    <>
                      <DollarSign className="w-3 h-3 text-emerald-500" /> Loan
                      Amount (PKR)
                    </>
                  }
                  htmlFor="principal"
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2"
                  error={errors.principal?.message}
                >
                  <Input
                    id="principal"
                    type="number"
                    {...register('principal', {
                      required: 'Amount is required',
                      min: { value: 1000, message: 'Minimum amount is 1000' },
                    })}
                    className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 h-auto"
                    placeholder="e.g. 50000"
                  />
                </FormField>

                <FormField
                  label={
                    <>
                      <Clock className="w-3 h-3 text-indigo-500" /> Duration
                      (Months)
                    </>
                  }
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2"
                  error={errors.duration?.message}
                >
                  <Select
                    onValueChange={(value) => {
                      setValue('duration', value);
                      clearErrors('duration');
                    }}
                  >
                    <SelectTrigger className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 h-auto text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all">
                      <SelectValue placeholder="Select Duration" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100 dark:border-white/[0.06]">
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
                </FormField>

                <FormField
                  label="Purpose / Notes (Optional)"
                  htmlFor="notes"
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  <Textarea
                    id="notes"
                    {...register('notes')}
                    rows={3}
                    className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    placeholder="Briefly describe why you need this loan..."
                  />
                </FormField>

                {principal && duration && (
                  <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 flex items-center gap-4">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-4 [&_svg]:h-4">
                      <Calculator />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                        Estimated Monthly Payment
                      </p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <p className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                          PKR {Number(estimatedMonthlyPayment).toLocaleString()}
                        </p>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          /mo
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Step 2: Guarantors */}
            {step === 2 && (
              <>
                {renderGrantorSearch(1)}
                <div className="h-px bg-slate-100 dark:bg-white/[0.06] my-2" />
                {renderGrantorSearch(2)}
              </>
            )}

            {/* Step 3: Document Upload */}
            {step === 3 && (
              <>
                <div
                  className={cn(
                    'border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer',
                    isDragging
                      ? 'border-primary bg-primary/5 scale-[1.02]'
                      : 'border-slate-200 dark:border-white/[0.08] hover:border-primary/30 hover:bg-slate-50/40 dark:hover:bg-white/[0.02]',
                    files.length >= 5 && 'opacity-50 pointer-events-none',
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (files.length < 5)
                      document.getElementById('doc-file-input').click();
                  }}
                >
                  <input
                    id="doc-file-input"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <Upload
                    size={28}
                    className="mx-auto text-slate-300 dark:text-slate-600 mb-3"
                  />
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {isDragging
                      ? 'Drop files here'
                      : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                    JPG, PNG, PDF — Max 5MB each — Up to 5 files
                  </p>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Uploaded ({files.length}/5)
                    </p>
                    {files.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] group"
                      >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-white/[0.04] flex items-center justify-center overflow-hidden shrink-0">
                          {f.preview ? (
                            <img
                              src={f.preview}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <File size={18} className="text-rose-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                            {f.file.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {(f.file.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        {/* Type selector */}
                        <Select
                          value={f.type}
                          onValueChange={(val) => updateFileType(idx, val)}
                        >
                          <SelectTrigger className="w-auto h-auto gap-1 text-[10px] font-bold bg-slate-50 dark:bg-white/[0.04] border-none rounded-lg px-2 py-1 focus:ring-1 focus:ring-primary/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DOC_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="p-1.5 rounded-full hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-medium">
                  Documents are optional but help speed up your approval.
                </p>
              </>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-5 border-t border-slate-100 dark:border-white/[0.06] bg-white dark:bg-slate-950 z-10 shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          {step > 1 ? (
            <Button
              variant="ghost"
              type="button"
              onClick={() => setStep(step - 1)}
              className="h-11 px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all flex items-center justify-center gap-2"
            >
              <ChevronLeft size={14} /> Back
            </Button>
          ) : (
            <Button
              variant="ghost"
              type="button"
              onClick={onClose}
              className="h-11 px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
            >
              Cancel
            </Button>
          )}

          {step < 3 ? (
            <Button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
            >
              Continue <ChevronRight size={14} />
            </Button>
          ) : (
            <Button
              form="loan-request-form"
              type="submit"
              isLoading={loading}
              className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
            >
              Submit Request
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberLoanRequestModal;
