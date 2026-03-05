import { useState, useEffect, useCallback } from 'react';
// Force Vite re-bundle: v3
import { QRCodeSVG } from 'qrcode.react';
import {
  Send,
  QrCode,
  ArrowRight,
  TrendingUp,
  Wallet,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  Phone,
  Mail,
  Zap,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  RefreshCw,
  Copy,
  ChevronRight,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, capitalize } from '@/lib/utils';
import StatsCard from '@/components/StatsCard';
import QRScanner from '@/components/QRScanner';
import MemberTransferSkeleton from '@/components/member/MemberTransferSkeleton';

// ── Bank / Wallet directory ───────────────────────────────────────────────────
const WALLETS = [
  { id: 'jazzcash', label: 'JazzCash', color: '#D72229', emoji: '📱' },
  { id: 'easypaisa', label: 'EasyPaisa', color: '#1EA44A', emoji: '💚' },
  { id: 'nayapay', label: 'NayaPay', color: '#9B5CF6', emoji: '🟣' },
  { id: 'sadapay', label: 'SadaPay', color: '#E5343D', emoji: '❤️' },
];

const BANKS = [
  { id: 'ubl', label: 'UBL', color: '#003087', emoji: '🏦' },
  { id: 'habibmetro', label: 'Habib Metro', color: '#E2001A', emoji: '🏛️' },
  { id: 'hbl', label: 'HBL', color: '#00703c', emoji: '🟢' },
  { id: 'mcb', label: 'MCB', color: '#C8102E', emoji: '🔴' },
  { id: 'meezan', label: 'Meezan', color: '#00529B', emoji: '🕌' },
  { id: 'allied', label: 'Allied Bank', color: '#1D3461', emoji: '🏦' },
  { id: 'bankfalah', label: 'Bank Al-Falah', color: '#005B99', emoji: '🌙' },
  { id: 'scb', label: 'Standard Ch.', color: '#0F3557', emoji: '💼' },
];

// ── Tiny helpers ──────────────────────────────────────────────────────────────
const ALL_INSTITUTIONS = [...WALLETS, ...BANKS];

const getInstitution = (id) => ALL_INSTITUTIONS.find((i) => i.id === id);

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => toast.success('Copied!'));
};

// ── Transfer History Row ──────────────────────────────────────────────────────
const HistoryRow = ({ tx }) => {
  const inst = getInstitution(
    tx.bankName?.toLowerCase().replace(/\s/g, ''),
  ) || { emoji: '🏦', label: tx.bankName, color: '#6366f1' };
  const isSend = tx.direction === 'send';

  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40 hover:bg-muted/30 transition-all group">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm"
          style={{ backgroundColor: `${inst.color}18` }}
        >
          {inst.emoji}
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-tight">
            {inst.label}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium truncate max-w-[160px]">
            {tx.accountIdentifier}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={`text-sm font-black ${isSend ? 'text-destructive' : 'text-emerald-500'}`}
        >
          {isSend ? '−' : '+'}
          {formatCurrency(tx.amount)}
        </p>
        <p className="text-[9px] text-muted-foreground font-medium flex items-center gap-1 justify-end">
          {tx.referenceId}
          <button
            onClick={() => copyToClipboard(tx.referenceId)}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
          >
            <Copy size={9} />
          </button>
        </p>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const MemberTransfer = () => {
  const [activeTab, setActiveTab] = useState('send'); // 'send' | 'receive' | 'external'
  const [member, setMember] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  // --- internal P2P state ---
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [recipientName, setRecipientName] = useState('');

  // --- external transfer state ---
  const [extMode, setExtMode] = useState('send'); // 'send' | 'receive'
  const [selectedInst, setSelectedInst] = useState(null); // institution id
  const [extField, setExtField] = useState(''); // IBAN or mobile
  const [extTitle, setExtTitle] = useState('');
  const [extAmount, setExtAmount] = useState('');
  const [extNote, setExtNote] = useState('');
  const [extLoading, setExtLoading] = useState(false);
  const [extHistory, setExtHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [successRef, setSuccessRef] = useState(null);

  // ── Fetch member ─────────────────────────────────────────────────────────
  const fetchMemberData = useCallback(async () => {
    try {
      const memberToken = localStorage.getItem('member');
      const { data } = await api.get('/member-auth/me', {
        headers: {
          /* Auth header handled by browser cookies */
        },
      });
      setMember(data);
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemberData();
  }, [fetchMemberData]);

  // ── Fetch external history when tab is active ─────────────────────────────
  const fetchExtHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const memberToken = localStorage.getItem('member');
      const { data } = await api.get('/external-transfers?limit=8', {
        headers: {
          /* Auth header handled by browser cookies */
        },
      });
      setExtHistory(data.data || []);
    } catch {
      // silent
    } finally {
      setHistLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'external') fetchExtHistory();
  }, [activeTab, fetchExtHistory]);

  // ── Internal P2P lookup ───────────────────────────────────────────────────
  useEffect(() => {
    const lookup = async () => {
      if (recipient && recipient.trim().length >= 3) {
        setIsLookingUp(true);
        try {
          const memberToken = localStorage.getItem('member');
          const { data } = await api.get(
            `/members/portal/lookup?identifier=${recipient.trim()}`,
            {
              headers: {
                /* Auth header handled by browser cookies */
              },
            },
          );
          const filtered = data.filter(
            (m) => m._id !== member?._id && m.email !== member?.email,
          );
          setSearchResults(filtered);
          const exact = filtered.find(
            (m) =>
              m.email?.toLowerCase() === recipient.trim().toLowerCase() ||
              m.phone?.replace(/\D/g, '') ===
                recipient.trim().replace(/\D/g, '') ||
              m.savingAccountNumber?.toLowerCase() ===
                recipient.trim().toLowerCase() ||
              m.currentAccountNumber?.toLowerCase() ===
                recipient.trim().toLowerCase(),
          );
          setRecipientName(exact ? exact.name : '');
        } catch {
          setSearchResults([]);
          setRecipientName('');
        } finally {
          setIsLookingUp(false);
        }
      } else {
        setSearchResults([]);
        setRecipientName('');
      }
    };
    const t = setTimeout(lookup, 400);
    return () => clearTimeout(t);
  }, [recipient, member]);

  // ── Internal P2P submit ───────────────────────────────────────────────────
  const handleTransfer = async (e) => {
    if (e) e.preventDefault();
    if (!recipient || !amount) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      setLoading(true);
      const memberToken = localStorage.getItem('member');
      await api.post(
        '/members/portal/transfer',
        {
          recipientIdentifier: recipient.trim(),
          amount: parseFloat(amount),
          description,
        },
        {
          headers: {
            /* Auth header handled by browser cookies */
          },
        },
      );
      toast.success('Transfer successful!');
      setRecipient('');
      setAmount('');
      setDescription('');
      fetchMemberData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  // ── QR scan ───────────────────────────────────────────────────────────────
  const handleScanSuccess = (decodedText) => {
    setRecipient(decodedText.replace('finflow:', ''));
    setShowScanner(false);
    toast.success('Member detected!');
  };

  // ── External transfer submit ───────────────────────────────────────────────
  const handleExternalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInst || !extField || !extAmount) {
      toast.error('Please fill in all fields and select a bank/wallet');
      return;
    }
    const inst = getInstitution(selectedInst);
    const bankType = WALLETS.some((w) => w.id === selectedInst)
      ? 'wallet'
      : 'bank';

    try {
      setExtLoading(true);
      setSuccessRef(null);
      const memberToken = localStorage.getItem('member');
      const endpoint =
        extMode === 'send'
          ? '/external-transfers'
          : '/external-transfers/receive';
      const payload = {
        bankType,
        bankName: inst.label,
        accountIdentifier: extField,
        accountTitle: extTitle || undefined,
        amount: parseFloat(extAmount),
        description: extNote || undefined,
      };
      const { data } = await api.post(endpoint, payload, {
        headers: {
          /* Auth header handled by browser cookies */
        },
      });
      setSuccessRef(data.referenceId);
      toast.success(
        extMode === 'send' ? 'Transfer sent!' : 'Incoming transfer recorded!',
      );
      setExtField('');
      setExtTitle('');
      setExtAmount('');
      setExtNote('');
      setSelectedInst(null);
      fetchMemberData();
      fetchExtHistory();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transfer failed');
    } finally {
      setExtLoading(false);
    }
  };

  if (pageLoading) return <MemberTransferSkeleton />;

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="p-6 rounded-3xl bg-destructive/10 text-destructive">
          <XCircle size={40} strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-lg font-black tracking-tight">
            Failed to load profile
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Could not connect to the server. Please try again.
          </p>
        </div>
        <button
          onClick={() => {
            setPageLoading(true);
            fetchMemberData();
          }}
          className="px-6 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    );
  }

  const isWallet = selectedInst
    ? WALLETS.some((w) => w.id === selectedInst)
    : false;
  const selInst = selectedInst ? getInstitution(selectedInst) : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={
          <>
            Instant <span className="text-primary">Transfer</span>
          </>
        }
        description="Send funds to any member or external bank — instantly."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Current Balance"
          amount={formatCurrency(member.currentBalance)}
          icon={<Wallet size={20} />}
          color={
            member.currentBalance < 0
              ? 'bg-rose-500 shadow-rose-500/20'
              : 'bg-primary shadow-primary/20'
          }
          isGlass
        />
        <StatsCard
          title="Total Sent"
          amount={formatCurrency(member.totalWithdrawn || 0)}
          icon={<Send size={20} />}
          color="bg-indigo-500 shadow-indigo-500/20"
          isGlass
        />
        <StatsCard
          title="Total Received"
          amount={formatCurrency(member.totalInvested || 0)}
          icon={<TrendingUp size={20} />}
          color="bg-emerald-500 shadow-emerald-500/20"
          isGlass
        />
      </div>

      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* ── Tab Switcher (3 tabs) ── */}
        <div className="flex p-1.5 bg-muted/30 backdrop-blur-xl rounded-[2rem] border border-border/50 w-full max-w-xl mx-auto relative z-10">
          {[
            { id: 'send', label: 'Send', icon: <Send size={14} /> },
            { id: 'receive', label: 'Receive', icon: <QrCode size={14} /> },
            {
              id: 'external',
              label: 'IBFT / Bank',
              icon: <Building2 size={14} />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-xl shadow-primary/20'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ══════════════════════ SEND TAB ══════════════════════ */}
        {activeTab === 'send' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Transfer Form */}
            <div className="bg-card/50 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-8 animate-in slide-in-from-left-4 duration-500">
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tighter">
                  New Transfer
                </h3>
                <p className="text-xs font-medium text-muted-foreground">
                  Secure fund movement between FinFlo accounts.
                </p>
              </div>

              <form onSubmit={handleTransfer} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative group">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 mb-2 block">
                      Recipient Details
                    </label>
                    <div className="relative">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        value={recipient}
                        autoComplete="off"
                        onChange={(e) => {
                          setRecipient(e.target.value);
                          setRecipientName('');
                        }}
                        placeholder="Email, Phone, or Account Number"
                        className="w-full pl-14 pr-6 py-4 rounded-2xl bg-muted/20 border border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-black text-sm"
                        required
                      />
                      {searchResults.length > 0 && !recipientName && (
                        <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-2 rounded-[2rem] bg-card border border-border/50 shadow-2xl space-y-1 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl">
                          {searchResults.map((m) => (
                            <button
                              key={m._id}
                              type="button"
                              onClick={() => {
                                const id =
                                  m.savingAccountNumber ||
                                  m.currentAccountNumber ||
                                  m.email ||
                                  m.phone;
                                setRecipient(id);
                                setRecipientName(m.name);
                                setTimeout(() => setSearchResults([]), 100);
                              }}
                              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-muted text-left transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                  <User size={16} />
                                </div>
                                <div>
                                  <p className="text-xs font-black uppercase tracking-tight">
                                    {m.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground font-medium">
                                    {m.savingAccountNumber ||
                                      m.currentAccountNumber ||
                                      m.email ||
                                      m.phone}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {!isLookingUp &&
                        recipient &&
                        recipient.length >= 3 &&
                        searchResults.length === 0 &&
                        !recipientName && (
                          <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-4 rounded-[2rem] bg-card/90 border border-border/50 shadow-2xl animate-in fade-in slide-in-from-top-2 backdrop-blur-xl">
                            <div className="flex flex-col items-center gap-2 py-2">
                              <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive">
                                <XCircle size={20} />
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                No Member Found
                              </p>
                            </div>
                          </div>
                        )}
                    </div>
                    {recipientName && (
                      <div className="mx-4 mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 animate-in fade-in zoom-in-95">
                        <CheckCircle2 size={14} className="shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">
                          Verified Recipient: {recipientName}
                        </span>
                      </div>
                    )}
                    {isLookingUp && !recipientName && (
                      <p className="text-[9px] text-muted-foreground ml-6 mt-2 flex items-center gap-1.5 animate-pulse">
                        <Loader2 size={10} className="animate-spin" /> Searching
                        for member...
                      </p>
                    )}
                  </div>

                  <div className="relative group">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 mb-2 block">
                      Transfer Amount
                    </label>
                    <div className="relative">
                      <Zap className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-14 pr-16 py-4 rounded-2xl bg-muted/20 border border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-black text-sm"
                        required
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        PKR
                      </span>
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 mb-2 block">
                      Note (Optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What's this for?"
                      className="w-full px-6 py-4 rounded-2xl bg-muted/20 border border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium text-sm resize-none"
                      rows={2}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  isLoading={loading}
                  variant="gradient"
                  className="w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl"
                >
                  <Send size={18} />
                  Execute Transfer
                </Button>
              </form>
            </div>

            {/* QR Scanner */}
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div
                onClick={() => setShowScanner(!showScanner)}
                className={`p-10 rounded-[2.5rem] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-6 group ${
                  showScanner
                    ? 'border-primary bg-primary/5'
                    : 'border-border/50 bg-card/30 hover:bg-muted/20'
                }`}
              >
                <div
                  className={`p-6 rounded-3xl transition-all duration-500 ${
                    showScanner
                      ? 'bg-primary text-white scale-110'
                      : 'bg-muted/50 text-muted-foreground group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary'
                  }`}
                >
                  <QrCode size={40} strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <h4 className="font-black tracking-tight text-lg mb-1">
                    {showScanner ? 'Scanning...' : 'Scan Member QR'}
                  </h4>
                  <p className="text-xs font-medium text-muted-foreground max-w-[200px]">
                    {showScanner
                      ? "Point your camera at a member's code"
                      : 'Instant recipient detection via camera scanner'}
                  </p>
                </div>
              </div>
              {showScanner && (
                <div className="animate-in zoom-in-95 duration-500">
                  <QRScanner
                    onScanSuccess={handleScanSuccess}
                    onScanError={() => {}}
                  />
                  <Button
                    variant="ghost"
                    onClick={() => setShowScanner(false)}
                    className="w-full mt-4 text-xs font-bold text-muted-foreground"
                  >
                    Cancel Scanner
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════ RECEIVE TAB ══════════════════════ */}
        {activeTab === 'receive' && (
          <div className="max-w-md mx-auto space-y-8 animate-in zoom-in-95 duration-500">
            <div className="bg-white dark:bg-slate-900 border border-border/50 p-12 rounded-[3rem] shadow-2xl flex flex-col items-center gap-10 text-center relative overflow-hidden">
              <QrCode className="absolute -right-16 -top-16 w-64 h-64 opacity-[0.03] text-primary pointer-events-none" />
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tighter">
                  Your Personal QR
                </h3>
                <p className="text-xs font-medium text-muted-foreground">
                  Show this to others to receive funds instantly.
                </p>
              </div>
              <div className="p-8 bg-white rounded-[2.5rem] shadow-inner border-[12px] border-primary/5">
                <QRCodeSVG
                  value={`finflow:${member.savingAccountNumber || member.currentAccountNumber || member.email}`}
                  size={200}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: '/logo.svg',
                    x: undefined,
                    y: undefined,
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>
              <div className="space-y-4 w-full">
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 flex flex-col gap-1 items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Account Number
                  </span>
                  <span className="font-black text-primary text-lg tracking-widest">
                    {member.savingAccountNumber ||
                      member.currentAccountNumber ||
                      '—'}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 flex flex-col gap-1 items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Email
                  </span>
                  <span className="font-black text-primary text-sm">
                    {member.email}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <CheckCircle2 size={12} className="text-primary" />
                  Verified FinFlo Account
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 flex flex-col items-center gap-3 text-center">
                <Mail size={20} className="text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  Scan to Email
                </span>
              </div>
              <div className="p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 flex flex-col items-center gap-3 text-center">
                <Phone size={20} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  Instant Receive
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════ IBFT / BANK TAB ══════════════════════ */}
        {activeTab === 'external' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Send / Receive sub-toggle */}
            <div className="flex p-1 bg-muted/20 rounded-2xl border border-border/40 w-fit mx-auto gap-1">
              <button
                onClick={() => {
                  setExtMode('send');
                  setSuccessRef(null);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  extMode === 'send'
                    ? 'bg-destructive/90 text-white shadow-md'
                    : 'text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <ArrowUpRight size={13} /> Send
              </button>
              <button
                onClick={() => {
                  setExtMode('receive');
                  setSuccessRef(null);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  extMode === 'receive'
                    ? 'bg-emerald-500/90 text-white shadow-md'
                    : 'text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <ArrowDownLeft size={13} /> Receive
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Left: Form */}
              <div className="bg-card/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-border/50 space-y-6">
                <div>
                  <h3 className="text-lg font-black tracking-tight">
                    {extMode === 'send'
                      ? 'Send via Bank / Wallet'
                      : 'Record Incoming Transfer'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium mt-1">
                    {extMode === 'send'
                      ? 'Funds will be deducted from your balance.'
                      : 'Record money you received and credit your balance.'}
                  </p>
                </div>

                {/* Success state */}
                {successRef && (
                  <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-2 animate-in zoom-in-95">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 size={18} />
                      <span className="text-xs font-black uppercase tracking-tight">
                        {extMode === 'send'
                          ? 'Transfer Sent!'
                          : 'Incoming Recorded!'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-emerald-500/10 rounded-xl px-4 py-2 mt-1">
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                        Reference
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[11px] text-emerald-700 dark:text-emerald-400 tracking-wider">
                          {successRef}
                        </span>
                        <button
                          onClick={() => copyToClipboard(successRef)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleExternalSubmit} className="space-y-5">
                  {/* STEP 1: Select institution */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">
                      1. Select Wallet or Bank
                    </label>

                    {/* Mobile Wallets */}
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 ml-1">
                      Mobile Wallets
                    </p>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {WALLETS.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() =>
                            setSelectedInst(selectedInst === w.id ? null : w.id)
                          }
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-center ${
                            selectedInst === w.id
                              ? 'border-primary bg-primary/8 scale-[1.04] shadow-lg'
                              : 'border-border/40 bg-muted/10 hover:bg-muted/30 hover:scale-[1.02]'
                          }`}
                          style={
                            selectedInst === w.id
                              ? {
                                  borderColor: w.color,
                                  backgroundColor: `${w.color}12`,
                                }
                              : {}
                          }
                        >
                          <span className="text-xl leading-none">
                            {w.emoji}
                          </span>
                          <span className="text-[8px] font-black uppercase tracking-tight leading-tight">
                            {w.label}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Banks */}
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 ml-1">
                      Banks (IBFT)
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {BANKS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() =>
                            setSelectedInst(selectedInst === b.id ? null : b.id)
                          }
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-center ${
                            selectedInst === b.id
                              ? 'border-primary scale-[1.04] shadow-lg'
                              : 'border-border/40 bg-muted/10 hover:bg-muted/30 hover:scale-[1.02]'
                          }`}
                          style={
                            selectedInst === b.id
                              ? {
                                  borderColor: b.color,
                                  backgroundColor: `${b.color}12`,
                                }
                              : {}
                          }
                        >
                          <span className="text-xl leading-none">
                            {b.emoji}
                          </span>
                          <span className="text-[8px] font-black uppercase tracking-tight leading-tight">
                            {b.label}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Selected badge */}
                    {selInst && (
                      <div
                        className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl animate-in fade-in zoom-in-95"
                        style={{
                          backgroundColor: `${selInst.color}12`,
                          border: `1px solid ${selInst.color}30`,
                        }}
                      >
                        <span className="text-base">{selInst.emoji}</span>
                        <span
                          className="text-[10px] font-black uppercase tracking-tight"
                          style={{ color: selInst.color }}
                        >
                          {selInst.label} selected
                        </span>
                        <CheckCircle2
                          size={12}
                          className="ml-auto"
                          style={{ color: selInst.color }}
                        />
                      </div>
                    )}
                  </div>

                  {/* STEP 2: Account details */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                      2. Account Details
                    </label>

                    <div className="relative">
                      {isWallet ? (
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      ) : (
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      )}
                      <input
                        type="text"
                        value={extField}
                        onChange={(e) => setExtField(e.target.value)}
                        placeholder={
                          isWallet
                            ? '03XX-XXXXXXX (Mobile Number)'
                            : 'PKXX XXXX XXXX XXXX XXXX XXXX (IBAN)'
                        }
                        className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-muted/20 border border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium text-sm"
                        required
                      />
                    </div>

                    {!isWallet && (
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={extTitle}
                          onChange={(e) => setExtTitle(e.target.value)}
                          placeholder="Account Title (Optional)"
                          className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-muted/20 border border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* STEP 3: Amount + Note */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                      3. Amount & Note
                    </label>
                    <div className="relative">
                      <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="number"
                        value={extAmount}
                        onChange={(e) => setExtAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-16 py-3.5 rounded-xl bg-muted/20 border border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-black text-sm"
                        required
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        PKR
                      </span>
                    </div>
                    <textarea
                      value={extNote}
                      onChange={(e) => setExtNote(e.target.value)}
                      placeholder="Note (optional)"
                      className="w-full px-4 py-3.5 rounded-xl bg-muted/20 border border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium text-sm resize-none"
                      rows={2}
                    />
                  </div>

                  <Button
                    type="submit"
                    isLoading={extLoading}
                    className={`w-full h-12 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all ${
                      extMode === 'send'
                        ? 'bg-destructive hover:bg-destructive/90 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    {extMode === 'send' ? (
                      <>
                        <ArrowUpRight size={16} />
                        Send{' '}
                        {extAmount
                          ? formatCurrency(parseFloat(extAmount) || 0)
                          : 'PKR'}
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft size={16} />
                        Record Incoming
                      </>
                    )}
                  </Button>
                </form>
              </div>

              {/* Right: Transfer History */}
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                    Recent External Transfers
                  </h4>
                  <button
                    onClick={fetchExtHistory}
                    className="p-2 rounded-xl hover:bg-muted/40 text-muted-foreground transition-colors"
                  >
                    <RefreshCw
                      size={13}
                      className={histLoading ? 'animate-spin' : ''}
                    />
                  </button>
                </div>

                {histLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-16 rounded-2xl bg-muted/20 animate-pulse"
                      />
                    ))}
                  </div>
                ) : extHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-16 text-center rounded-[2.5rem] border-2 border-dashed border-border/40">
                    <div className="p-5 rounded-3xl bg-muted/30">
                      <Building2
                        size={28}
                        className="text-muted-foreground/50"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        No transfers yet
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Your IBFT & wallet history will appear here
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {extHistory.map((tx) => (
                      <HistoryRow key={tx._id} tx={tx} />
                    ))}
                  </div>
                )}

                {/* Mini info cards */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex flex-col gap-1">
                    <ArrowUpRight size={16} className="text-amber-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Sent
                    </span>
                    <span className="text-sm font-black text-amber-500">
                      {formatCurrency(
                        extHistory
                          .filter((t) => t.direction === 'send')
                          .reduce((s, t) => s + t.amount, 0),
                      )}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-1">
                    <ArrowDownLeft size={16} className="text-emerald-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Received
                    </span>
                    <span className="text-sm font-black text-emerald-500">
                      {formatCurrency(
                        extHistory
                          .filter((t) => t.direction === 'receive')
                          .reduce((s, t) => s + t.amount, 0),
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberTransfer;
