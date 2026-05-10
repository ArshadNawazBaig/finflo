import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  FileText, Calculator, DollarSign, Clock, User, ShieldCheck,
  Loader2, Upload, X, File, Image, ChevronRight, ChevronLeft, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, cn } from '@/lib/utils';

const STEPS = [
  { id: 1, label: 'Loan Details', icon: DollarSign },
  { id: 2, label: 'Guarantors', icon: User },
  { id: 3, label: 'Documents', icon: Upload },
];

const DOC_TYPES = [
  'Pay Slip', 'Business Registration', 'Collateral Photo',
  'Bank Statement', 'ID Card (CNIC)', 'Other',
];

const MemberLoanRequestModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const {
    register, handleSubmit, watch, reset, setValue, setError, clearErrors,
    formState: { errors },
  } = useForm({
    defaultValues: {
      principal: '', duration: '', notes: '',
      grantor1Identifier: '', grantor2Identifier: '',
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
    }
  }, [isOpen]);

  const principal = watch('principal');
  const duration = watch('duration');
  const grantor1Identifier = watch('grantor1Identifier');
  const grantor2Identifier = watch('grantor2Identifier');

  // Grantor 1 lookup
  useEffect(() => {
    const lookup = async () => {
      if (grantor1Identifier && grantor1Identifier.length >= 3 && !g1BackendId && grantor1Identifier !== grantor1Name) {
        setIsLookingUp1(true);
        try {
          const { data } = await api.get(`/members/portal/lookup?identifier=${grantor1Identifier}`);
          let filtered = currentMember ? data.filter((m) => m._id !== currentMember._id) : data;
          const g2Val = watch('grantor2Identifier');
          if (g2Val) filtered = filtered.filter((m) => m.cnic !== g2Val && m.phone !== g2Val && m.name !== g2Val);
          setSearchResults1(filtered);
          const normalize = (val) => val?.replace(/\D/g, '') || '';
          const target = normalize(grantor1Identifier);
          const exact = filtered.find((m) => normalize(m.cnic) === target || normalize(m.phone) === target);
          setGrantor1Name(exact && target.length >= 11 ? exact.name : '');
        } catch { setSearchResults1([]); setGrantor1Name(''); }
        finally { setIsLookingUp1(false); }
      } else if (!g1BackendId) { setSearchResults1([]); setGrantor1Name(''); }
      else { setSearchResults1([]); }
    };
    const t = setTimeout(lookup, 500);
    return () => clearTimeout(t);
  }, [grantor1Identifier, g1BackendId, currentMember, watch('grantor2Identifier'), g2BackendId]);

  // Grantor 2 lookup
  useEffect(() => {
    const lookup = async () => {
      if (grantor2Identifier && grantor2Identifier.length >= 3 && !g2BackendId && grantor2Identifier !== grantor2Name) {
        setIsLookingUp2(true);
        try {
          const { data } = await api.get(`/members/portal/lookup?identifier=${grantor2Identifier}`);
          let filtered = currentMember ? data.filter((m) => m._id !== currentMember._id) : data;
          const g1Val = watch('grantor1Identifier');
          if (g1Val) filtered = filtered.filter((m) => m.cnic !== g1Val && m.phone !== g1Val && m.name !== g1Val);
          setSearchResults2(filtered);
          const normalize = (val) => val?.replace(/\D/g, '') || '';
          const target = normalize(grantor2Identifier);
          const exact = filtered.find((m) => normalize(m.cnic) === target || normalize(m.phone) === target);
          setGrantor2Name(exact && target.length >= 11 ? exact.name : '');
        } catch { setSearchResults2([]); setGrantor2Name(''); }
        finally { setIsLookingUp2(false); }
      } else if (!g2BackendId) { setSearchResults2([]); setGrantor2Name(''); }
      else { setSearchResults2([]); }
    };
    const t = setTimeout(lookup, 500);
    return () => clearTimeout(t);
  }, [grantor2Identifier, g2BackendId, currentMember, watch('grantor1Identifier'), g1BackendId]);

  const estimatedMonthlyPayment = principal && duration
    ? (() => {
        const p = Number(principal);
        const r = defaultInterestRate / 100;
        const n = Number(duration);
        const totalInterest = p * r * (n / 12);
        return Math.round((p + totalInterest) / n);
      })()
    : 0;

  // File handling
  const addFiles = useCallback((newFiles) => {
    const remaining = 5 - files.length;
    if (remaining <= 0) return toast.error('Maximum 5 documents allowed');
    const toAdd = Array.from(newFiles).slice(0, remaining);
    const mapped = toAdd.map((f) => ({
      file: f,
      type: 'Other',
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }));
    setFiles((prev) => [...prev, ...mapped]);
  }, [files.length]);

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
      setError('grantor2Identifier', { type: 'manual', message: 'Grantor 1 and Grantor 2 cannot be the same member.' });
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
        headers: { 'Content-Type': 'multipart/form-data' },
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

    return (
      <div className="space-y-2 relative">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
          <User className="w-3 h-3 text-blue-500" /> Grantor {num}
        </label>
        <div className="relative">
          <input
            type="text"
            {...register(fieldName, {
              required: `Grantor ${num} is required`,
              onChange: () => { setBackendId(''); setName(''); },
            })}
            autoComplete="off"
            className="w-full px-5 py-3.5 rounded-2xl border border-border/50 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30 capitalize shadow-inner"
            placeholder="Search by name, CNIC or phone"
          />
          {isLooking && results.length === 0 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 size={14} className="animate-spin text-primary opacity-50" />
            </div>
          )}
          {results.length > 0 && !name && (
            <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-2 rounded-[1.8rem] bg-card border border-border/50 shadow-2xl space-y-1 backdrop-blur-xl">
              {results.map((member) => (
                <button
                  key={member._id} type="button"
                  onClick={() => {
                    setValue(fieldName, member.name);
                    setBackendId(member._id);
                    setName(member.name);
                    setResults([]);
                    clearErrors(fieldName);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted text-left transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-inner">
                    <User size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-black tracking-tight capitalize">{member.name}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{member.cnic || member.phone}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {name && (
            <div className="mx-1 mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
              <ShieldCheck size={12} className="shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Verified: {name}</span>
            </div>
          )}
        </div>
        {errors[fieldName] && (
          <p className="text-[10px] text-destructive font-bold ml-1">{errors[fieldName].message}</p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] !p-0 !gap-0 flex flex-col overflow-hidden rounded-[2.5rem] border-border/50 shadow-2xl">
        <DialogDescription className="sr-only">Multi-step loan application form.</DialogDescription>

        {/* Header with step indicator */}
        <div className="p-8 pb-6 border-b bg-background z-10 shrink-0 relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shrink-0 shadow-inner">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-black leading-tight text-foreground truncate">
                Request Loan
              </DialogTitle>
              <p className="text-xs font-medium text-muted-foreground mt-1 truncate">
                Step {step} of 3 — {STEPS[step - 1].label}
              </p>
            </div>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-xs font-black transition-all duration-300 shrink-0',
                  step > s.id ? 'bg-emerald-500 text-white' :
                  step === s.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' :
                  'bg-muted/50 text-muted-foreground/50',
                )}>
                  {step > s.id ? <Check size={14} /> : s.id}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300',
                    step > s.id ? 'bg-emerald-500' : 'bg-muted/30',
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-900/10">
          <form id="loan-request-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Step 1: Loan Details */}
            {step === 1 && (
              <>
                {currentMember && (
                  <div className="mb-4 p-5 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 flex items-center justify-between group/eligible hover:bg-amber-500/10 transition-colors">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600/70">Current Loan Eligibility</p>
                      <p className="text-2xl font-black text-amber-600 tracking-tight">
                        {formatCurrency(currentMember.creditLimit || 0)}
                      </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 group-hover/eligible:scale-110 transition-transform shadow-inner">
                      <ShieldCheck size={24} />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                    <DollarSign className="w-3 h-3 text-emerald-500" /> Loan Amount (PKR)
                  </label>
                  <input
                    type="number"
                    {...register('principal', { required: 'Amount is required', min: { value: 1000, message: 'Minimum amount is 1000' } })}
                    className="w-full px-5 py-3.5 rounded-2xl border border-border/50 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30 shadow-inner"
                    placeholder="e.g. 50000"
                  />
                  {errors.principal && <p className="text-[10px] text-destructive font-bold ml-1">{errors.principal.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                    <Clock className="w-3 h-3 text-indigo-500" /> Duration (Months)
                  </label>
                  <Select onValueChange={(value) => { setValue('duration', value); clearErrors('duration'); }}>
                    <SelectTrigger className="w-full px-5 py-3.5 h-auto rounded-2xl border border-border/50 bg-background text-sm font-medium focus:ring-2 focus:ring-primary/20 shadow-inner">
                      <SelectValue placeholder="Select Duration" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/50">
                      {[3, 6, 9, 12, 18, 24, 36].map((m) => (
                        <SelectItem key={m} value={m.toString()} className="text-sm rounded-xl">{m} Months</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.duration && <p className="text-[10px] text-destructive font-bold ml-1">{errors.duration.message}</p>}
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
                  <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-6 flex items-center gap-5">
                    <div className="p-4 bg-primary/10 rounded-2xl text-primary shrink-0 shadow-inner">
                      <Calculator size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Estimated Monthly Payment</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <p className="text-2xl font-black text-foreground tracking-tight">PKR {Number(estimatedMonthlyPayment).toLocaleString()}</p>
                        <span className="text-xs font-bold text-muted-foreground opacity-60">/mo</span>
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
                <div className="h-px bg-border/30 my-2" />
                {renderGrantorSearch(2)}
              </>
            )}

            {/* Step 3: Document Upload */}
            {step === 3 && (
              <>
                <div
                  className={cn(
                    'border-2 border-dashed rounded-[2rem] p-8 text-center transition-all cursor-pointer',
                    isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border/50 hover:border-primary/30 hover:bg-muted/10',
                    files.length >= 5 && 'opacity-50 pointer-events-none',
                  )}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => { if (files.length < 5) document.getElementById('doc-file-input').click(); }}
                >
                  <input
                    id="doc-file-input"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                  />
                  <Upload size={32} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-bold text-muted-foreground">
                    {isDragging ? 'Drop files here' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 font-medium mt-1">
                    JPG, PNG, PDF — Max 5MB each — Up to 5 files
                  </p>
                </div>

                {files.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                      Uploaded ({files.length}/5)
                    </p>
                    {files.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl border border-border/40 bg-card/50 group">
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                          {f.preview ? (
                            <img src={f.preview} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <File size={20} className="text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{f.file.name}</p>
                          <p className="text-[10px] text-muted-foreground">{(f.file.size / 1024).toFixed(0)} KB</p>
                        </div>
                        {/* Type selector */}
                        <select
                          value={f.type}
                          onChange={(e) => updateFileType(idx, e.target.value)}
                          className="text-[10px] font-bold bg-muted/30 border-none rounded-lg px-2 py-1 focus:ring-1 focus:ring-primary/30 cursor-pointer"
                        >
                          {DOC_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-center text-muted-foreground/50 font-medium">
                  Documents are optional but help speed up your approval.
                </p>
              </>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-8 border-t bg-background z-10 shrink-0 flex gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex-1 min-h-12 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-muted transition-all rounded-2xl border border-transparent hover:border-border/50 active:scale-95 flex items-center justify-center gap-2"
            >
              <ChevronLeft size={14} /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-12 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-muted transition-all rounded-2xl border border-transparent hover:border-border/50 active:scale-95"
            >
              Cancel
            </button>
          )}

          {step < 3 ? (
            <Button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              variant="gradient"
              className="flex-[2] min-h-12 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Continue <ChevronRight size={14} />
            </Button>
          ) : (
            <Button
              form="loan-request-form"
              type="submit"
              isLoading={loading}
              variant="gradient"
              className="flex-[2] min-h-12 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
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
