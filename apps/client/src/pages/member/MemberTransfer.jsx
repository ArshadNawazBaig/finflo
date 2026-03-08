import { useState, useEffect, useCallback } from 'react';
import {
  Send,
  Building2,
  ArrowRight,
  User,
  CheckCircle2,
  History,
  Info,
  Wallet,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, cn } from '@/lib/utils';

const BANKS = [
  {
    id: 'jazzcash',
    label: 'JazzCash',
    type: 'wallet',
    logo: '/assets/banks/jazzcash.png',
  },
  {
    id: 'easypaisa',
    label: 'EasyPaisa',
    type: 'wallet',
    logo: '/assets/banks/easypaisa.png',
  },
  {
    id: 'nayapay',
    label: 'NayaPay',
    type: 'wallet',
    logo: '/assets/banks/nayapay.png',
  },
  {
    id: 'sadapay',
    label: 'SadaPay',
    type: 'wallet',
    logo: '/assets/banks/sadapay.png',
  },
  {
    id: 'meezan',
    label: 'Meezan Bank',
    type: 'bank',
    logo: '/assets/banks/meezan.png',
  },
  { id: 'hbl', label: 'HBL', type: 'bank', logo: '/assets/banks/hbl.png' },
  {
    id: 'bankfalah',
    label: 'Bank Al-Falah',
    type: 'bank',
    logo: '/assets/banks/bank-alfalah.png',
  },
  {
    id: 'habibmetro',
    label: 'Habib Metro',
    type: 'bank',
    logo: '/assets/banks/habibmetro.png',
  },
  { id: 'nbp', label: 'NBP', type: 'bank', logo: '/assets/banks/nbp.png' },
  { id: 'ubl', label: 'UBL', type: 'bank', logo: '/assets/banks/ubl.png' },
  {
    id: 'soneri',
    label: 'Soneri Bank',
    type: 'bank',
    logo: '/assets/banks/soneri.png',
  },
  {
    id: 'standard-chartered',
    label: 'SCB',
    type: 'bank',
    logo: '/assets/banks/standard-chartered.png',
  },
];

const MemberTransfer = () => {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('internal'); // 'internal' | 'external'

  // Internal P2P State
  const [p2pRecipient, setP2pRecipient] = useState('');
  const [p2pAmount, setP2pAmount] = useState('');
  const [p2pNote, setP2pNote] = useState('');
  const [p2pLoading, setP2pLoading] = useState(false);
  const [p2pLookupData, setP2pLookupData] = useState(null);
  const [p2pResults, setP2pResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // External State
  const [extBank, setExtBank] = useState('');
  const [extAccount, setExtAccount] = useState('');
  const [extAccountTitle, setExtAccountTitle] = useState('');
  const [extAmount, setExtAmount] = useState('');
  const [extLoading, setExtLoading] = useState(false);

  // History State
  const [history, setHistory] = useState([]);

  // Fetch Member
  useEffect(() => {
    const fetchMember = async () => {
      try {
        const { data } = await api.get('/member-auth/me');
        setMember(data);
      } catch (error) {
        toast.error('Failed to load wallet balance.');
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, []);

  // Fetch History based on tab
  const fetchHistory = useCallback(async () => {
    try {
      if (activeTab === 'internal') {
        const { data } = await api.get('/members/portal/activity?limit=5');
        const p2pOnly = (data.data || []).filter(
          (tx) => tx.type === 'transfer_send' || tx.type === 'transfer_receive',
        );
        setHistory(p2pOnly);
      } else {
        const { data } = await api.get('/external-transfers?limit=5');
        setHistory(data.data || []);
      }
    } catch (error) {
      // Silent fail
    }
  }, [activeTab]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Lookup internal recipient
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (p2pRecipient.length >= 3) {
        try {
          const { data } = await api.get(
            `/members/portal/lookup?identifier=${p2pRecipient}`,
          );
          // Filter out current user
          const filtered = data.filter((m) => m._id !== member?._id);
          setP2pResults(filtered);
          setShowDropdown(filtered.length > 0);

          // Auto-select if exact match found (email or ID)
          const exactMatch = filtered.find(
            (m) =>
              m.email.toLowerCase() === p2pRecipient.toLowerCase() ||
              m.memberId === p2pRecipient,
          );
          if (exactMatch) {
            setP2pLookupData(exactMatch);
          }
        } catch (e) {
          setP2pResults([]);
          setShowDropdown(false);
        }
      } else {
        setP2pResults([]);
        setShowDropdown(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [p2pRecipient, member]);

  // Handlers
  const handleP2PTransfer = async (e) => {
    e.preventDefault();
    if (!p2pLookupData) return toast.error('Valid recipient required');
    if (!p2pAmount || isNaN(p2pAmount) || p2pAmount <= 0)
      return toast.error('Enter a valid amount');
    if (p2pAmount > member?.currentBalance)
      return toast.error('Insufficient funds');

    setP2pLoading(true);
    try {
      await api.post('/members/portal/transfer', {
        recipientId: p2pLookupData._id,
        amount: parseFloat(p2pAmount),
        description: p2pNote || `Transfer to ${p2pLookupData.name}`,
      });
      toast.success('Transfer sent successfully!');
      setP2pAmount('');
      setP2pNote('');
      setP2pRecipient('');
      setP2pLookupData(null);
      // Refresh balance and history
      const { data } = await api.get('/member-auth/me');
      setMember(data);
      fetchHistory();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transfer failed');
    } finally {
      setP2pLoading(false);
    }
  };

  const handleExternalWithdrawal = async (e) => {
    e.preventDefault();
    if (!extBank || !extAccount || !extAccountTitle)
      return toast.error('All bank details are required');
    if (!extAmount || isNaN(extAmount) || extAmount <= 0)
      return toast.error('Enter a valid amount');
    if (extAmount > member?.currentBalance)
      return toast.error('Insufficient funds');

    setExtLoading(true);
    try {
      const selectedInst = BANKS.find((b) => b.id === extBank);
      await api.post('/external-transfers', {
        bankName: selectedInst.label,
        accountIdentifier: extAccount,
        accountTitle: extAccountTitle,
        amount: parseFloat(extAmount),
        direction: 'send', // Withdrawal out from system
      });
      toast.success('Withdrawal request submitted!');
      setExtAmount('');
      setExtAccount('');
      setExtAccountTitle('');
      setExtBank('');
      // Refresh balance and history
      const { data } = await api.get('/member-auth/me');
      setMember(data);
      fetchHistory();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Withdrawal failed');
    } finally {
      setExtLoading(false);
    }
  };

  if (loading) return null; // Wait for skeleton layout implementation or use empty array

  return (
    <div className="space-y-10 pb-20 w-full animate-in fade-in duration-300">
      <PageHeader
        title="Transfer & Withdraw"
        description="Send funds to friends or withdraw exactly to your Raast/Bank account."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Transfer Controls */}
        <div className="lg:col-span-8 space-y-6">
          {/* Tabs */}
          <div className="flex p-1.5 bg-muted/30 rounded-2xl border border-border/40 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('internal')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                activeTab === 'internal'
                  ? 'bg-background shadow-sm text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <User size={16} /> Finflo Member
            </button>
            <button
              onClick={() => setActiveTab('external')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                activeTab === 'external'
                  ? 'bg-background shadow-sm text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Building2 size={16} /> Withdraw To Bank
            </button>
          </div>

          <div className="bg-card p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm relative overflow-hidden w-full flex flex-col">
            {/* Background design */}
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
              {activeTab === 'internal' ? (
                <Send size={200} />
              ) : (
                <Building2 size={200} />
              )}
            </div>

            <div
              className={cn(
                'w-full transition-opacity duration-300',
                activeTab !== 'internal' && 'hidden',
              )}
            >
              <form
                onSubmit={handleP2PTransfer}
                className="space-y-6 relative z-10 w-full"
              >
                <div>
                  <h3 className="text-2xl font-black tracking-tighter">
                    Send to Member
                  </h3>
                  <p className="text-sm font-medium text-muted-foreground mt-1">
                    Instant, zero-fee transfers between Finflo accounts.
                  </p>
                </div>

                <div className="space-y-6 bg-muted/20 p-6 rounded-[2rem] border border-border/40">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                      Recipient Email or Finflo ID
                    </label>
                    <div className="relative">
                      <Input
                        placeholder="Search by Email, ID or CNIC"
                        className="h-14 rounded-2xl bg-background border-border/50 text-base px-6 shadow-none"
                        value={p2pRecipient}
                        onChange={(e) => setP2pRecipient(e.target.value)}
                        onBlur={() =>
                          setTimeout(() => setShowDropdown(false), 200)
                        }
                        onFocus={() =>
                          p2pResults.length > 0 && setShowDropdown(true)
                        }
                      />

                      {showDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                          {p2pResults.map((res) => (
                            <button
                              key={res._id}
                              type="button"
                              onClick={() => {
                                setP2pLookupData(res);
                                setP2pRecipient(res.email);
                                setShowDropdown(false);
                              }}
                              className="w-full px-6 py-4 flex flex-col items-start gap-1 hover:bg-muted/50 transition-colors border-b border-border/10 last:border-none"
                            >
                              <span className="text-sm font-bold text-foreground capitalize">
                                {res.name}
                              </span>
                              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                                CNIC: {res.cnic || 'N/A'} • {res.memberId}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {p2pLookupData && (
                      <div className="mx-2 mt-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-emerald-600 capitalize">
                            {p2pLookupData.name}
                          </p>
                          <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest">
                            {p2pLookupData.memberId || 'VERIFIED'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                      Transfer Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-lg">
                        Rs.
                      </span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="h-16 rounded-2xl bg-background border-border/50 text-xl font-bold pl-16 pr-6 shadow-none"
                        value={p2pAmount}
                        onChange={(e) => setP2pAmount(e.target.value)}
                        min="1"
                        max={member?.currentBalance || 0}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                      Note (Optional)
                    </label>
                    <Input
                      placeholder="What's this for?"
                      className="h-14 rounded-2xl bg-background border-border/50 text-sm px-6 shadow-none"
                      value={p2pNote}
                      onChange={(e) => setP2pNote(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={p2pLoading || !p2pLookupData || !p2pAmount}
                  className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98]"
                >
                  {p2pLoading ? 'Processing...' : 'Send Funds Instantly'}
                  {!p2pLoading && <ArrowRight size={16} />}
                </Button>
              </form>
            </div>

            <div
              className={cn(
                'w-full transition-opacity duration-300',
                activeTab !== 'external' && 'hidden',
              )}
            >
              <form
                onSubmit={handleExternalWithdrawal}
                className="space-y-6 relative z-10 w-full"
              >
                <div>
                  <h3 className="text-2xl font-black tracking-tighter">
                    Withdraw to Bank / Raast
                  </h3>
                  <p className="text-sm font-medium text-muted-foreground mt-1">
                    Transfer funds out to your personal bank account or mobile
                    wallet.
                  </p>
                </div>

                <div className="space-y-6 bg-muted/20 p-6 rounded-[2rem] border border-border/40">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                      Destinaton Bank
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {BANKS.map((bank) => (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => setExtBank(bank.id)}
                          className={cn(
                            'p-4 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-all',
                            extBank === bank.id
                              ? 'border-primary bg-primary/10 shadow-sm'
                              : 'border-border/60 bg-background hover:border-border hover:bg-muted/30',
                          )}
                        >
                          <div
                            className={cn(
                              'transition-transform duration-300 w-10 h-10 flex items-center justify-center',
                              extBank === bank.id
                                ? 'scale-110'
                                : 'grayscale opacity-70',
                            )}
                          >
                            <img
                              src={bank.logo}
                              alt={bank.label}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <span
                            className={cn(
                              'text-[10px] font-black uppercase tracking-widest text-center transition-colors',
                              extBank === bank.id
                                ? 'text-primary'
                                : 'text-muted-foreground',
                            )}
                          >
                            {bank.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                        IBAN / Raast ID
                      </label>
                      <Input
                        placeholder="PK... or 03..."
                        className="h-14 rounded-2xl bg-background border-border/50 px-6 shadow-none"
                        value={extAccount}
                        onChange={(e) => setExtAccount(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                        Account Title
                      </label>
                      <Input
                        placeholder="Account Holder Name"
                        className="h-14 rounded-2xl bg-background border-border/50 px-6 shadow-none uppercase"
                        value={extAccountTitle}
                        onChange={(e) =>
                          setExtAccountTitle(e.target.value.toUpperCase())
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                      Withdrawal Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-lg">
                        Rs.
                      </span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="h-16 rounded-2xl bg-background border-border/50 text-xl font-bold pl-16 pr-6 shadow-none"
                        value={extAmount}
                        onChange={(e) => setExtAmount(e.target.value)}
                        required
                        min="1"
                        max={member?.currentBalance || 0}
                      />
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground ml-2 flex items-center gap-1">
                      <Info size={12} /> Standard bank processing times apply
                      (1-2 business days).
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={
                    extLoading ||
                    !extBank ||
                    !extAmount ||
                    !extAccount ||
                    !extAccountTitle
                  }
                  className="w-full h-14 rounded-2xl bg-foreground text-background hover:bg-neutral-800 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98]"
                >
                  {extLoading ? 'Processing...' : 'Request Bank Withdrawal'}
                  {!extLoading && <ArrowRight size={16} />}
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column - Balance & Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary/5 border border-primary/20 rounded-[2.5rem] p-8 space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Wallet size={120} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              Available Balance
            </p>
            <h2 className="text-4xl font-black tracking-tighter text-foreground">
              {formatCurrency(member?.currentBalance || 0)}
            </h2>
            <div className="h-px bg-border/50 w-full my-4!" />
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                <span>Daily Limit</span>
                <span>Rs. 500k</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                <span>Monthly Limit</span>
                <span>Unlimited</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-[2.5rem] p-6 space-y-4">
            <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
              <History size={16} className="text-muted-foreground" /> Recent{' '}
              {activeTab === 'internal' ? 'Transfers' : 'Withdrawals'}
            </h3>

            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="p-6 text-center text-xs font-bold text-muted-foreground/50">
                  No recent activity found.
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item._id}
                    className="p-4 rounded-xl bg-muted/20 border border-border/30 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black tracking-tight capitalize">
                          {item.description || item.bankName}
                        </p>
                        {item.status && (
                          <div
                            className={cn(
                              'text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md flex items-center gap-1 border leading-none transition-all',
                              item.status === 'Completed' &&
                                'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
                              item.status === 'Pending' &&
                                'bg-amber-500/10 text-amber-600 border-amber-500/20',
                              item.status === 'Failed' &&
                                'bg-rose-500/10 text-rose-600 border-rose-500/20',
                            )}
                          >
                            <span
                              className={cn(
                                'w-1 h-1 rounded-full',
                                item.status === 'Completed' && 'bg-emerald-500',
                                item.status === 'Pending' &&
                                  'bg-amber-500 animate-pulse',
                                item.status === 'Failed' && 'bg-rose-500',
                              )}
                            />
                            {item.status}
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase">
                        {new Date(
                          item.date || item.createdAt,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-sm font-black text-rose-500">
                      -{formatCurrency(item.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberTransfer;
