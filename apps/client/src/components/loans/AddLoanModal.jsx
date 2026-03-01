import { useState, useEffect } from 'react';
import {
  Loader2,
  DollarSign,
  Clock,
  Percent,
  User,
  PlusCircle,
  X,
  FileText,
  Calculator,
  BookOpen,
} from 'lucide-react';
import UpgradePrompt from '@/components/pricing/UpgradePrompt';
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
import { toast } from 'sonner';

const AddLoanModal = ({ isOpen, onClose, onSuccess, initialCustomerId }) => {
  const [formData, setFormData] = useState({
    customerId: initialCustomerId || '',
    principal: '',
    rate: '',
    duration: '',
    startDate: new Date(),
    interestType: 'simple',
    grantor1Identifier: '',
    grantor1IdentifierForBackend: '',
    grantor2Identifier: '',
    grantor2IdentifierForBackend: '',
    productId: '', // Selected loan product
  });
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeData, setUpgradeData] = useState({});
  const [grantor1Name, setGrantor1Name] = useState('');
  const [isLookingUp1, setIsLookingUp1] = useState(false);
  const [isFocused1, setIsFocused1] = useState(false);
  const [isFocused2, setIsFocused2] = useState(false);
  const [searchResults1, setSearchResults1] = useState([]);

  const [grantor2Name, setGrantor2Name] = useState('');
  const [isLookingUp2, setIsLookingUp2] = useState(false);
  const [searchResults2, setSearchResults2] = useState([]);

  // Fetch customers for the dropdown
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
            setFormData((prev) => {
              if (!prev.rate) {
                return { ...prev, rate: data.defaultInterestRate };
              }
              return prev;
            });
          }
        } catch (error) {
          console.error('Failed to fetch system settings:', error);
        }
      };
      fetchSettings();
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'grantor1Identifier') {
      setFormData({
        ...formData,
        [name]: value,
        grantor1IdentifierForBackend: '', // Reset backend identifier when typing
      });
    } else if (name === 'grantor2Identifier') {
      setFormData({
        ...formData,
        [name]: value,
        grantor2IdentifierForBackend: '', // Reset backend identifier when typing
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Auto-lookup grantor 1
  useEffect(() => {
    const lookup1 = async () => {
      // Only lookup if the input doesn't match the already selected name
      if (
        formData.grantor1Identifier &&
        formData.grantor1Identifier.length >= 3 &&
        !formData.grantor1IdentifierForBackend &&
        formData.grantor1Identifier !== grantor1Name
      ) {
        setIsLookingUp1(true);
        try {
          const { data } = await api.get(
            `/members/lookup?identifier=${formData.grantor1Identifier}`,
          );

          // Filter out selected borrower
          const selectedCustomer = customers.find(
            (c) => c._id === formData.customerId,
          );
          const borrowerMemberId = selectedCustomer?.memberId;

          let filteredResults = borrowerMemberId
            ? data.filter((m) => m._id !== borrowerMemberId)
            : data;

          // Filter out Grantor 2 if already typed/selected
          const g2Backend = formData.grantor2IdentifierForBackend;
          const g2Input = formData.grantor2Identifier;

          filteredResults = filteredResults.filter((m) => {
            if (g2Backend && (m.cnic === g2Backend || m.phone === g2Backend))
              return false;
            if (
              g2Input &&
              (m.cnic === g2Input || m.phone === g2Input || m.name === g2Input)
            )
              return false;
            return true;
          });

          setSearchResults1(filteredResults);

          const normalize = (val) => val?.replace(/\D/g, '') || '';
          const targetDigits = normalize(formData.grantor1Identifier);

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
      } else if (!formData.grantor1IdentifierForBackend) {
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
    formData.grantor1Identifier,
    formData.customerId,
    formData.grantor2Identifier,
    formData.grantor2IdentifierForBackend,
  ]);

  // Auto-lookup grantor 2
  useEffect(() => {
    const lookup2 = async () => {
      // Only lookup if the input doesn't match the already selected name
      if (
        formData.grantor2Identifier &&
        formData.grantor2Identifier.length >= 3 &&
        !formData.grantor2IdentifierForBackend &&
        formData.grantor2Identifier !== grantor2Name
      ) {
        setIsLookingUp2(true);
        try {
          const { data } = await api.get(
            `/members/lookup?identifier=${formData.grantor2Identifier}`,
          );

          // Filter out selected borrower
          const selectedCustomer = customers.find(
            (c) => c._id === formData.customerId,
          );
          const borrowerMemberId = selectedCustomer?.memberId;

          let filteredResults = borrowerMemberId
            ? data.filter((m) => m._id !== borrowerMemberId)
            : data;

          // Filter out Grantor 1 if already typed/selected
          const g1Backend = formData.grantor1IdentifierForBackend;
          const g1Input = formData.grantor1Identifier;

          filteredResults = filteredResults.filter((m) => {
            if (g1Backend && (m.cnic === g1Backend || m.phone === g1Backend))
              return false;
            if (
              g1Input &&
              (m.cnic === g1Input || m.phone === g1Input || m.name === g1Input)
            )
              return false;
            return true;
          });

          setSearchResults2(filteredResults);

          const normalize = (val) => val?.replace(/\D/g, '') || '';
          const targetDigits = normalize(formData.grantor2Identifier);

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
      } else if (!formData.grantor2IdentifierForBackend) {
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
    formData.grantor2Identifier,
    formData.customerId,
    formData.grantor1Identifier,
    formData.grantor1IdentifierForBackend,
  ]);

  const handleProductChange = (productId) => {
    const product = products.find((p) => p._id === productId);
    if (product) {
      setFormData((prev) => ({
        ...prev,
        productId,
        rate: product.interestRate.toString(),
        duration: product.duration.toString(),
        interestType: product.interestType,
        principal:
          prev.principal ||
          (product.minAmount ? product.minAmount.toString() : ''),
      }));
      toast.success(`Standardized terms for "${product.name}" applied`);
    } else {
      setFormData((prev) => ({ ...prev, productId: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submissionData = {
        ...formData,
        product: formData.productId || undefined,
        grantor1Identifier:
          formData.grantor1IdentifierForBackend || formData.grantor1Identifier,
        grantor2Identifier:
          formData.grantor2IdentifierForBackend || formData.grantor2Identifier,
        startDate: formData.startDate.toISOString().split('T')[0],
      };

      if (
        submissionData.grantor1Identifier === submissionData.grantor2Identifier
      ) {
        setError('Grantor 1 and Grantor 2 cannot be the same member.');
        setLoading(false);
        return;
      }

      // Remove temporary display field if not needed by backend
      delete submissionData.grantor1IdentifierForBackend;
      delete submissionData.grantor2IdentifierForBackend;

      await api.post('/loans', submissionData);
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        customerId: '',
        principal: '',
        rate: '',
        duration: '',
        startDate: new Date(),
        interestType: 'emi',
        grantor1Identifier: '',
        grantor1IdentifierForBackend: '',
        grantor2Identifier: '',
        grantor2IdentifierForBackend: '',
      });
    } catch (err) {
      // Check if it's a plan limit error
      if (err.response?.status === 403 && err.response?.data?.upgradeRequired) {
        setUpgradeData({
          plan: err.response.data.plan,
          limit: err.response.data.limit,
          current: err.response.data.current,
          feature: 'loans',
        });
        setShowUpgradePrompt(true);
        setError(''); // Clear error since we're showing upgrade prompt
      } else {
        setError(err.response?.data?.message || 'Failed to create loan');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[95vh] !p-0 !gap-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 border-b bg-background z-10">
          <DialogHeader className="p-0">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 shrink-0">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-2xl font-black">
                  Issue New Loan
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-sm font-medium">
                  Set up a new lending agreement.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-2xl text-xs font-bold uppercase tracking-wider border border-destructive/20 mb-6 animate-in fade-in zoom-in-95">
              {error}
            </div>
          )}

          <form
            id="add-loan-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="space-y-5">
              {/* Loan Product Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary px-1 flex items-center gap-2">
                  <BookOpen className="w-3 h-3" /> Select Loan Product Template
                </label>
                <Select
                  value={formData.productId}
                  onValueChange={handleProductChange}
                >
                  <SelectTrigger className="w-full px-4 py-3 h-auto rounded-2xl border-2 border-primary/20 bg-primary/5 text-sm font-black focus:ring-2 focus:ring-primary/20 capitalize">
                    <SelectValue placeholder="Standardize terms... (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="none"
                      className="font-bold text-muted-foreground"
                    >
                      Custom (No Template)
                    </SelectItem>
                    {products.map((p) => (
                      <SelectItem
                        key={p._id}
                        value={p._id}
                        className="capitalize font-bold"
                      >
                        {p.name} ({p.interestRate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <User className="w-3 h-3" /> Select Borrower
                </label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) => {
                    setFormData({ ...formData, customerId: value });
                    setError('');
                  }}
                  required
                >
                  <SelectTrigger className="w-full px-4 py-3 h-auto rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:ring-2 focus:ring-primary/20 capitalize">
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
                {formData.customerId && (
                  <div className="px-1">
                    {(() => {
                      const selected = customers.find(
                        (c) => c._id === formData.customerId,
                      );
                      if (
                        selected &&
                        !selected.savingAccountNumber &&
                        !selected.currentAccountNumber
                      ) {
                        return (
                          <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter animate-pulse">
                            ⚠️ This customer has no account number
                            (Saving/Current). Assignment blocked.
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              {/* Interest Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <Percent className="w-3 h-3 text-orange-500" /> Interest Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, interestType: 'simple' })
                    }
                    className={`px-4 py-3 rounded-2xl border text-sm font-black transition-all ${
                      formData.interestType === 'simple'
                        ? 'border-orange-500 bg-orange-500/10 text-orange-500 ring-2 ring-orange-500/20'
                        : 'border-border/50 bg-background/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Simple Interest
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, interestType: 'emi' })
                    }
                    className={`px-4 py-3 rounded-2xl border text-sm font-black transition-all ${
                      formData.interestType === 'emi'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 ring-2 ring-indigo-500/20'
                        : 'border-border/50 bg-background/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    EMI (Reducing)
                  </button>
                </div>
              </div>

              {/* Grantor 1 Selection */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <User className="w-3 h-3 text-blue-500" /> Grantor 1 (Member
                  Name, CNIC or Phone)
                </label>
                <input
                  name="grantor1Identifier"
                  type="text"
                  autoComplete="off"
                  placeholder="Search by CNIC, Name, or Phone"
                  value={formData.grantor1Identifier}
                  onChange={handleChange}
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
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30 capitalize"
                />
                {isLookingUp1 && searchResults1.length === 0 && (
                  <p className="text-[9px] text-muted-foreground ml-1 flex items-center gap-1.5 animate-pulse absolute -bottom-4 left-0">
                    <Loader2 size={10} className="animate-spin" /> Searching...
                  </p>
                )}

                {searchResults1.length > 0 && !grantor1Name && (
                  <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-2 rounded-2xl bg-card border border-border/50 shadow-2xl space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {searchResults1.map((member) => {
                      const normalize = (val) => val?.replace(/\D/g, '') || '';
                      const isSelected =
                        normalize(member.cnic) ===
                          normalize(formData.grantor1Identifier) ||
                        normalize(member.phone) ===
                          normalize(formData.grantor1Identifier);

                      return (
                        <button
                          key={member._id}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              grantor1Identifier: member.name, // Show name in input
                              grantor1IdentifierForBackend:
                                member.cnic || member.phone, // Store identifier for backend
                            });
                            setGrantor1Name(member.name);
                            setTimeout(() => setSearchResults1([]), 100);
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted text-left transition-colors group ${isSelected ? 'bg-primary/5 border border-primary/20' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              <User size={14} />
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase tracking-tight">
                                {member.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-medium">
                                {member.cnic
                                  ? `CNIC: ${member.cnic}`
                                  : `Phone: ${member.phone}`}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {!isLookingUp1 &&
                  isFocused1 &&
                  formData.grantor1Identifier &&
                  formData.grantor1Identifier.length >= 3 &&
                  searchResults1.length === 0 &&
                  !grantor1Name && (
                    <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-4 rounded-2xl bg-card border border-border/50 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex flex-col items-center justify-center gap-2 py-2">
                        <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                          <PlusCircle size={16} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          No Member Found
                        </p>
                        <p className="text-[9px] text-muted-foreground font-medium text-center px-4">
                          No member matches "{formData.grantor1Identifier}"
                        </p>
                      </div>
                    </div>
                  )}

                {grantor1Name && (
                  <div className="mx-1 mt-1 flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 animate-in fade-in zoom-in-95">
                    <User size={10} className="shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                      Verified: {grantor1Name} (
                      {formData.grantor1IdentifierForBackend ||
                        formData.grantor1Identifier}
                      )
                    </span>
                  </div>
                )}
                <p className="text-[9px] text-muted-foreground px-1 font-medium">
                  Type at least 3 digits. Leave empty for self-guaranteed.
                </p>
              </div>

              {/* Grantor 2 Selection */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <User className="w-3 h-3 text-blue-500" /> Grantor 2 (Member
                  Name, CNIC or Phone)
                </label>
                <input
                  name="grantor2Identifier"
                  type="text"
                  autoComplete="off"
                  placeholder="Search by CNIC, Name, or Phone"
                  value={formData.grantor2Identifier}
                  onChange={handleChange}
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
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30 capitalize"
                />
                {isLookingUp2 && searchResults2.length === 0 && (
                  <p className="text-[9px] text-muted-foreground ml-1 flex items-center gap-1.5 animate-pulse absolute -bottom-4 left-0">
                    <Loader2 size={10} className="animate-spin" /> Searching...
                  </p>
                )}

                {searchResults2.length > 0 && !grantor2Name && (
                  <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-2 rounded-2xl bg-card border border-border/50 shadow-2xl space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {searchResults2.map((member) => {
                      const normalize = (val) => val?.replace(/\D/g, '') || '';
                      const isSelected =
                        normalize(member.cnic) ===
                          normalize(formData.grantor2Identifier) ||
                        normalize(member.phone) ===
                          normalize(formData.grantor2Identifier);

                      return (
                        <button
                          key={member._id}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              grantor2Identifier: member.name, // Show name in input
                              grantor2IdentifierForBackend:
                                member.cnic || member.phone, // Store identifier for backend
                            });
                            setGrantor2Name(member.name);
                            setTimeout(() => setSearchResults2([]), 100);
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted text-left transition-colors group ${isSelected ? 'bg-primary/5 border border-primary/20' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              <User size={14} />
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase tracking-tight">
                                {member.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-medium">
                                {member.cnic
                                  ? `CNIC: ${member.cnic}`
                                  : `Phone: ${member.phone}`}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {!isLookingUp2 &&
                  isFocused2 &&
                  formData.grantor2Identifier &&
                  formData.grantor2Identifier.length >= 3 &&
                  searchResults2.length === 0 &&
                  !grantor2Name && (
                    <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-4 rounded-2xl bg-card border border-border/50 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex flex-col items-center justify-center gap-2 py-2">
                        <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                          <PlusCircle size={16} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          No Member Found
                        </p>
                        <p className="text-[9px] text-muted-foreground font-medium text-center px-4">
                          No member matches "{formData.grantor2Identifier}"
                        </p>
                      </div>
                    </div>
                  )}

                {grantor2Name && (
                  <div className="mx-1 mt-1 flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 animate-in fade-in zoom-in-95">
                    <User size={10} className="shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                      Verified: {grantor2Name} (
                      {formData.grantor2IdentifierForBackend ||
                        formData.grantor2Identifier}
                      )
                    </span>
                  </div>
                )}
                <p className="text-[9px] text-muted-foreground px-1 font-medium">
                  Type at least 3 digits. Leave empty for self-guaranteed.
                </p>
              </div>

              {/* Principal & Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                    <DollarSign className="w-3 h-3 text-emerald-500" />{' '}
                    Principal
                  </label>
                  <input
                    name="principal"
                    type="number"
                    placeholder="e.g. 50000"
                    required
                    min="0"
                    value={formData.principal}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                    <Percent className="w-3 h-3 text-indigo-500" /> Interest
                    Rate (%)
                  </label>
                  <input
                    name="rate"
                    type="number"
                    placeholder="e.g. 15"
                    required
                    min="0"
                    step="0.1"
                    value={formData.rate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                  />
                </div>
              </div>

              {/* Duration & Start Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Term (Months)
                  </label>
                  <input
                    name="duration"
                    type="number"
                    placeholder="e.g. 12"
                    required
                    min="1"
                    value={formData.duration}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                    <CalendarIcon className="w-3 h-3" /> Commencement
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate.toISOString().split('T')[0]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        startDate: new Date(e.target.value),
                      })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-muted-foreground"
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
            form="add-loan-form"
            type="submit"
            isLoading={loading}
            disabled={
              formData.customerId &&
              (() => {
                const customer = customers.find(
                  (c) => c._id === formData.customerId,
                );
                return (
                  customer &&
                  !customer.savingAccountNumber &&
                  !customer.currentAccountNumber
                );
              })()
            }
            variant="gradient"
            className="px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3"
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
