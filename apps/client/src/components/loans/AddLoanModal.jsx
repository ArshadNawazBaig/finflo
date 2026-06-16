import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Loader2,
  DollarSign,
  Clock,
  Percent,
  User,
  PlusCircle,
  BookOpen,
} from 'lucide-react';
import UpgradePrompt from '@/components/pricing/UpgradePrompt';
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
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ui/FormField';
import { toast } from 'sonner';

const AddLoanModal = ({ isOpen, onClose, onSuccess, initialCustomerId }) => {
  // ------------------------------------------------------------
  // Complex autocomplete / product-selection kept as local state
  // ------------------------------------------------------------
  const [customerId, setCustomerId] = useState(initialCustomerId || '');
  const [interestType, setInterestType] = useState('simple');
  const [startDate, setStartDate] = useState(new Date());
  const [productId, setProductId] = useState('');
  const [grantor1Identifier, setGrantor1Identifier] = useState('');
  const [grantor1IdentifierForBackend, setGrantor1IdentifierForBackend] =
    useState('');
  const [grantor2Identifier, setGrantor2Identifier] = useState('');
  const [grantor2IdentifierForBackend, setGrantor2IdentifierForBackend] =
    useState('');
  const [grantor1Display, setGrantor1Display] = useState('');
  const [grantor2Display, setGrantor2Display] = useState('');

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeData, setUpgradeData] = useState({});

  const [grantor1Name, setGrantor1Name] = useState('');
  const [isLookingUp1, setIsLookingUp1] = useState(false);
  const [isFocused1, setIsFocused1] = useState(false);
  const [searchResults1, setSearchResults1] = useState([]);
  const [grantor2Name, setGrantor2Name] = useState('');
  const [isLookingUp2, setIsLookingUp2] = useState(false);
  const [isFocused2, setIsFocused2] = useState(false);
  const [searchResults2, setSearchResults2] = useState([]);

  // RHF for the 3 numeric fields that need per-field errors
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: { principal: '', rate: '', duration: '' },
  });

  // Fetch customers, products, and default settings
  useEffect(() => {
    if (isOpen) {
      const fetchCustomers = async () => {
        try {
          const { data } = await api.get('/customers?limit=100');
          setCustomers(data.data || []);
        } catch (err) {
          console.error('Failed to fetch customers', err);
        }
      };
      fetchCustomers();

      const fetchProducts = async () => {
        try {
          const { data } = await api.get('/loan-products');
          setProducts(data.filter((p) => p.isActive));
        } catch (err) {
          console.error('Failed to fetch loan products', err);
        }
      };
      fetchProducts();

      const fetchSettings = async () => {
        try {
          const { data } = await api.get('/system-settings');
          if (data && data.defaultInterestRate) {
            const currentRate = getValues('rate');
            if (!currentRate)
              setValue('rate', data.defaultInterestRate.toString());
          }
        } catch (error) {
          console.error('Failed to fetch system settings:', error);
        }
      };
      fetchSettings();
    }
  }, [isOpen]);

  // Grantor 1 autocomplete lookup
  useEffect(() => {
    const lookup1 = async () => {
      if (
        grantor1Identifier &&
        grantor1Identifier.length >= 3 &&
        !grantor1IdentifierForBackend &&
        grantor1Identifier !== grantor1Name
      ) {
        setIsLookingUp1(true);
        try {
          const { data } = await api.get(
            `/members/lookup?identifier=${grantor1Identifier}`,
          );
          const selectedCustomer = customers.find((c) => c._id === customerId);
          const borrowerMemberId = selectedCustomer?.memberId;
          let filteredResults = borrowerMemberId
            ? data.filter((m) => m._id !== borrowerMemberId)
            : data;
          filteredResults = filteredResults.filter((m) => {
            if (
              grantor2IdentifierForBackend &&
              (m.cnic === grantor2IdentifierForBackend ||
                m.phone === grantor2IdentifierForBackend)
            )
              return false;
            if (
              grantor2Identifier &&
              (m.cnic === grantor2Identifier ||
                m.phone === grantor2Identifier ||
                m.name === grantor2Identifier)
            )
              return false;
            return true;
          });
          setSearchResults1(filteredResults);
          const normalize = (val) => val?.replace(/\D/g, '') || '';
          const targetDigits = normalize(grantor1Identifier);
          const exactMatch = filteredResults.find(
            (m) =>
              normalize(m.cnic) === targetDigits ||
              normalize(m.phone) === targetDigits,
          );
          if (exactMatch && targetDigits.length >= 11)
            setGrantor1Name(exactMatch.name);
          else setGrantor1Name('');
        } catch {
          setSearchResults1([]);
          setGrantor1Name('');
        } finally {
          setIsLookingUp1(false);
        }
      } else if (!grantor1IdentifierForBackend) {
        setSearchResults1([]);
        setGrantor1Name('');
      } else {
        setSearchResults1([]);
      }
    };
    const debounce = setTimeout(lookup1, 500);
    return () => clearTimeout(debounce);
  }, [
    grantor1Identifier,
    customerId,
    grantor2Identifier,
    grantor2IdentifierForBackend,
  ]);

  // Grantor 2 autocomplete lookup
  useEffect(() => {
    const lookup2 = async () => {
      if (
        grantor2Identifier &&
        grantor2Identifier.length >= 3 &&
        !grantor2IdentifierForBackend &&
        grantor2Identifier !== grantor2Name
      ) {
        setIsLookingUp2(true);
        try {
          const { data } = await api.get(
            `/members/lookup?identifier=${grantor2Identifier}`,
          );
          const selectedCustomer = customers.find((c) => c._id === customerId);
          const borrowerMemberId = selectedCustomer?.memberId;
          let filteredResults = borrowerMemberId
            ? data.filter((m) => m._id !== borrowerMemberId)
            : data;
          filteredResults = filteredResults.filter((m) => {
            if (
              grantor1IdentifierForBackend &&
              (m.cnic === grantor1IdentifierForBackend ||
                m.phone === grantor1IdentifierForBackend)
            )
              return false;
            if (
              grantor1Identifier &&
              (m.cnic === grantor1Identifier ||
                m.phone === grantor1Identifier ||
                m.name === grantor1Identifier)
            )
              return false;
            return true;
          });
          setSearchResults2(filteredResults);
          const normalize = (val) => val?.replace(/\D/g, '') || '';
          const targetDigits = normalize(grantor2Identifier);
          const exactMatch = filteredResults.find(
            (m) =>
              normalize(m.cnic) === targetDigits ||
              normalize(m.phone) === targetDigits,
          );
          if (exactMatch && targetDigits.length >= 11)
            setGrantor2Name(exactMatch.name);
          else setGrantor2Name('');
        } catch {
          setSearchResults2([]);
          setGrantor2Name('');
        } finally {
          setIsLookingUp2(false);
        }
      } else if (!grantor2IdentifierForBackend) {
        setSearchResults2([]);
        setGrantor2Name('');
      } else {
        setSearchResults2([]);
      }
    };
    const debounce = setTimeout(lookup2, 500);
    return () => clearTimeout(debounce);
  }, [
    grantor2Identifier,
    customerId,
    grantor1Identifier,
    grantor1IdentifierForBackend,
  ]);

  const handleProductChange = (pid) => {
    const product = products.find((p) => p._id === pid);
    if (product) {
      setProductId(pid);
      setValue('rate', product.interestRate.toString());
      setValue('duration', product.duration.toString());
      setInterestType(product.interestType);
      if (!getValues('principal') && product.minAmount) {
        setValue('principal', product.minAmount.toString());
      }
      toast.success(`Standardized terms for "${product.name}" applied`);
    } else {
      setProductId('');
    }
  };

  const resetAll = () => {
    reset({ principal: '', rate: '', duration: '' });
    setCustomerId(initialCustomerId || '');
    setInterestType('simple');
    setStartDate(new Date());
    setProductId('');
    setGrantor1Identifier('');
    setGrantor1IdentifierForBackend('');
    setGrantor2Identifier('');
    setGrantor2IdentifierForBackend('');
    setGrantor1Name('');
    setGrantor2Name('');
    setGrantor1Display('');
    setGrantor2Display('');
  };

  const onSubmit = async (formData) => {
    setLoading(true);

    if (!customerId) {
      setError('root', { message: 'Please select a borrower' });
      setLoading(false);
      return;
    }

    const g1 = grantor1IdentifierForBackend || grantor1Identifier;
    const g2 = grantor2IdentifierForBackend || grantor2Identifier;

    if (g1 && g2 && g1 === g2) {
      setError('root', {
        message: 'Grantor 1 and Grantor 2 cannot be the same member.',
      });
      setLoading(false);
      return;
    }

    try {
      await api.post('/loans', {
        customerId,
        principal: formData.principal,
        rate: formData.rate,
        duration: formData.duration,
        interestType,
        startDate: startDate.toISOString().split('T')[0],
        product: productId || undefined,
        grantor1Identifier: g1,
        grantor2Identifier: g2,
      });
      onSuccess();
      onClose();
      resetAll();
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.upgradeRequired) {
        setUpgradeData({
          plan: err.response.data.plan,
          limit: err.response.data.limit,
          current: err.response.data.current,
          feature: 'loans',
        });
        setShowUpgradePrompt(true);
      } else {
        setError('root', {
          message: err.response?.data?.message || 'Failed to create loan',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] !p-0 !gap-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 sm:p-7 pb-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <PlusCircle />
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500 mb-1.5">
              New Loan
            </p>
            <DialogTitle>Issue New Loan</DialogTitle>
            <DialogDescription className="mt-1">
              Set up a new lending agreement.
            </DialogDescription>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-6 custom-scrollbar">
          {errors.root && (
            <div className="bg-rose-500/10 text-rose-500 p-4 rounded-2xl text-xs font-bold uppercase tracking-wider border border-rose-500/20 mb-5 animate-in fade-in zoom-in-95">
              {errors.root.message}
            </div>
          )}

          <form
            id="add-loan-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="space-y-5">
              {/* Loan Product Selection */}
              <FormField
                label={
                  <>
                    <BookOpen className="w-3 h-3" /> Select Loan Product Template
                  </>
                }
                labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-primary flex items-center gap-2"
              >
                <Select value={productId} onValueChange={handleProductChange}>
                  <SelectTrigger className="w-full px-4 py-3 h-auto rounded-2xl border border-primary/20 bg-primary/5 text-sm font-semibold focus:ring-2 focus:ring-primary/20 capitalize">
                    <SelectValue placeholder="Standardize terms... (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="none"
                      className="font-semibold text-slate-500 dark:text-slate-400"
                    >
                      Custom (No Template)
                    </SelectItem>
                    {products.map((p) => (
                      <SelectItem
                        key={p._id}
                        value={p._id}
                        className="capitalize font-semibold"
                      >
                        {p.name} ({p.interestRate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {/* Customer Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <User className="w-3 h-3" /> Select Borrower
                </label>
                <Select
                  value={customerId}
                  onValueChange={(value) => setCustomerId(value)}
                  required
                >
                  <SelectTrigger className="w-full px-4 py-3 h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-sm font-medium focus:ring-2 focus:ring-primary/20 capitalize">
                    <SelectValue placeholder="Choose a customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem
                        key={c._id}
                        value={c._id}
                        className="capitalize"
                      >
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {customerId &&
                  (() => {
                    const selected = customers.find(
                      (c) => c._id === customerId,
                    );
                    if (
                      selected &&
                      !selected.savingAccountNumber &&
                      !selected.currentAccountNumber &&
                      !selected.loanAccountNumber
                    ) {
                      return (
                        <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tighter animate-pulse px-1">
                          ⚠️ This customer has no account number
                          (Saving/Current/Loan). Assignment blocked.
                        </p>
                      );
                    }
                    return null;
                  })()}
              </div>

              {/* Interest Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <Percent className="w-3 h-3 text-orange-500" /> Interest Type
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setInterestType('simple')}
                    className={`px-3 py-3 rounded-2xl border text-xs font-bold transition-all ${interestType === 'simple' ? 'border-orange-500/40 bg-orange-500/10 text-orange-500 ring-2 ring-orange-500/20 hover:bg-orange-500/10 hover:text-orange-500' : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}
                  >
                    Simple
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setInterestType('emi')}
                    className={`px-3 py-3 rounded-2xl border text-xs font-bold transition-all ${interestType === 'emi' ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-500 ring-2 ring-indigo-500/20 hover:bg-indigo-500/10 hover:text-indigo-500' : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}
                  >
                    EMI (Reducing)
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setInterestType('compound')}
                    className={`px-3 py-3 rounded-2xl border text-xs font-bold transition-all ${interestType === 'compound' ? 'border-rose-500/40 bg-rose-500/10 text-rose-500 ring-2 ring-rose-500/20 hover:bg-rose-500/10 hover:text-rose-500' : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}
                  >
                    Compound
                  </Button>
                </div>
              </div>

              {/* Grantor 1 Selection */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <User className="w-3 h-3 text-blue-500" /> Grantor 1 (Member
                  Name, CNIC or Phone)
                </label>
                <Input
                  type="text"
                  autoComplete="off"
                  placeholder="Search by CNIC, Name, or Phone"
                  value={grantor1Identifier}
                  onChange={(e) => {
                    setGrantor1Identifier(e.target.value);
                    setGrantor1IdentifierForBackend('');
                  }}
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
                  className="h-auto px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-semibold focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400/50 capitalize"
                />
                {isLookingUp1 && searchResults1.length === 0 && (
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 ml-1 flex items-center gap-1.5 animate-pulse absolute -bottom-4 left-0">
                    <Loader2 size={10} className="animate-spin" /> Searching...
                  </p>
                )}
                {searchResults1.length > 0 && !grantor1Name && (
                  <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-2 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/[0.06] shadow-[0_40px_80px_-20px_rgba(15,23,42,0.35)] space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {searchResults1.map((member) => {
                      const normalize = (val) => val?.replace(/\D/g, '') || '';
                      const isSelected =
                        normalize(member.cnic) ===
                          normalize(grantor1Identifier) ||
                        normalize(member.phone) ===
                          normalize(grantor1Identifier);
                      return (
                        <Button
                          key={member._id}
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setGrantor1Identifier(member.name);
                            setGrantor1IdentifierForBackend(member._id);
                            setGrantor1Display(member.cnic || member.phone);
                            setGrantor1Name(member.name);
                            setTimeout(() => setSearchResults1([]), 100);
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] text-left transition-colors group ${isSelected ? 'bg-primary/5 border border-primary/20 hover:bg-primary/5' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                              <User size={14} />
                            </div>
                            <div>
                              <p className="text-xs font-bold tracking-tight text-slate-900 dark:text-white capitalize">
                                {member.name}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                {member.cnic
                                  ? `CNIC: ${member.cnic}`
                                  : `Phone: ${member.phone}`}
                              </p>
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                )}
                {!isLookingUp1 &&
                  isFocused1 &&
                  grantor1Identifier &&
                  grantor1Identifier.length >= 3 &&
                  searchResults1.length === 0 &&
                  !grantor1Name && (
                    <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/[0.06] shadow-[0_40px_80px_-20px_rgba(15,23,42,0.35)] animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex flex-col items-center justify-center gap-2 py-2">
                        <div className="h-8 w-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                          <PlusCircle size={14} />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          No Member Found
                        </p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium text-center px-4">
                          No member matches "{grantor1Identifier}"
                        </p>
                      </div>
                    </div>
                  )}
                {grantor1Name && (
                  <div className="mt-1.5 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-in fade-in zoom-in-95">
                    <User size={10} className="shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Verified: {grantor1Name} (
                      {grantor1Display || grantor1Identifier})
                    </span>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                  Type at least 3 digits. Leave empty for self-guaranteed.
                </p>
              </div>

              {/* Grantor 2 Selection */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <User className="w-3 h-3 text-blue-500" /> Grantor 2 (Member
                  Name, CNIC or Phone)
                </label>
                <Input
                  type="text"
                  autoComplete="off"
                  placeholder="Search by CNIC, Name, or Phone"
                  value={grantor2Identifier}
                  onChange={(e) => {
                    setGrantor2Identifier(e.target.value);
                    setGrantor2IdentifierForBackend('');
                  }}
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
                  className="h-auto px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-semibold focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400/50 capitalize"
                />
                {isLookingUp2 && searchResults2.length === 0 && (
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 ml-1 flex items-center gap-1.5 animate-pulse absolute -bottom-4 left-0">
                    <Loader2 size={10} className="animate-spin" /> Searching...
                  </p>
                )}
                {searchResults2.length > 0 && !grantor2Name && (
                  <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-2 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/[0.06] shadow-[0_40px_80px_-20px_rgba(15,23,42,0.35)] space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {searchResults2.map((member) => {
                      const normalize = (val) => val?.replace(/\D/g, '') || '';
                      const isSelected =
                        normalize(member.cnic) ===
                          normalize(grantor2Identifier) ||
                        normalize(member.phone) ===
                          normalize(grantor2Identifier);
                      return (
                        <Button
                          key={member._id}
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setGrantor2Identifier(member.name);
                            setGrantor2IdentifierForBackend(member._id);
                            setGrantor2Display(member.cnic || member.phone);
                            setGrantor2Name(member.name);
                            setTimeout(() => setSearchResults2([]), 100);
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] text-left transition-colors group ${isSelected ? 'bg-primary/5 border border-primary/20 hover:bg-primary/5' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                              <User size={14} />
                            </div>
                            <div>
                              <p className="text-xs font-bold tracking-tight text-slate-900 dark:text-white capitalize">
                                {member.name}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                {member.cnic
                                  ? `CNIC: ${member.cnic}`
                                  : `Phone: ${member.phone}`}
                              </p>
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                )}
                {!isLookingUp2 &&
                  isFocused2 &&
                  grantor2Identifier &&
                  grantor2Identifier.length >= 3 &&
                  searchResults2.length === 0 &&
                  !grantor2Name && (
                    <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/[0.06] shadow-[0_40px_80px_-20px_rgba(15,23,42,0.35)] animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex flex-col items-center justify-center gap-2 py-2">
                        <div className="h-8 w-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                          <PlusCircle size={14} />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          No Member Found
                        </p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium text-center px-4">
                          No member matches "{grantor2Identifier}"
                        </p>
                      </div>
                    </div>
                  )}
                {grantor2Name && (
                  <div className="mt-1.5 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-in fade-in zoom-in-95">
                    <User size={10} className="shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Verified: {grantor2Name} (
                      {grantor2Display || grantor2Identifier})
                    </span>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                  Type at least 3 digits. Leave empty for self-guaranteed.
                </p>
              </div>

              {/* Principal & Rate */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label={
                    <>
                      <DollarSign className="w-3 h-3 text-emerald-500" />{' '}
                      Principal
                    </>
                  }
                  htmlFor="principal"
                  labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2"
                  error={errors.principal?.message}
                >
                  <Input
                    id="principal"
                    type="number"
                    placeholder="e.g. 50000"
                    min="0"
                    className="h-auto px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-semibold focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400/50"
                    {...register('principal', {
                      required: 'Principal is required',
                      min: { value: 1, message: 'Must be greater than 0' },
                    })}
                  />
                </FormField>
                <FormField
                  label={
                    <>
                      <Percent className="w-3 h-3 text-indigo-500" /> Interest
                      Rate (%)
                    </>
                  }
                  htmlFor="rate"
                  labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2"
                  error={errors.rate?.message}
                >
                  <Input
                    id="rate"
                    type="number"
                    placeholder="e.g. 15"
                    min="0"
                    step="0.1"
                    className="h-auto px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-semibold focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400/50"
                    {...register('rate', {
                      required: 'Interest rate is required',
                      min: { value: 0, message: 'Must be ≥ 0' },
                    })}
                  />
                </FormField>
              </div>

              {/* Duration & Start Date */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label={
                    <>
                      <Clock className="w-3 h-3" /> Term (Months)
                    </>
                  }
                  htmlFor="duration"
                  labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2"
                  error={errors.duration?.message}
                >
                  <Input
                    id="duration"
                    type="number"
                    placeholder="e.g. 12"
                    min="1"
                    className="h-auto px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('duration', {
                      required: 'Duration is required',
                      min: { value: 1, message: 'Must be ≥ 1 month' },
                    })}
                  />
                </FormField>
                <FormField
                  label={
                    <>
                      <CalendarIcon className="w-3 h-3" /> Commencement
                    </>
                  }
                  htmlFor="loan-start-date"
                  labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2"
                >
                  <Input
                    id="loan-start-date"
                    type="date"
                    value={startDate.toISOString().split('T')[0]}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                    className="h-auto px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-medium focus:ring-2 focus:ring-primary/20 transition-all text-slate-500 dark:text-slate-400"
                  />
                </FormField>
              </div>
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-white/[0.06]">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
          >
            Cancel
          </Button>
          <Button
            form="add-loan-form"
            type="submit"
            isLoading={loading}
            disabled={
              customerId &&
              (() => {
                const cust = customers.find((c) => c._id === customerId);
                return (
                  cust &&
                  !cust.savingAccountNumber &&
                  !cust.currentAccountNumber &&
                  !cust.loanAccountNumber
                );
              })()
            }
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
          >
            {!loading && <PlusCircle size={14} />}
            Create Loan
          </Button>
        </div>
      </DialogContent>

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        plan={upgradeData.plan}
        limit={upgradeData.limit}
        current={upgradeData.current}
        feature={upgradeData.feature}
      />
    </Dialog>
  );
};

export default AddLoanModal;
