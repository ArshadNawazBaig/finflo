import { useState, useEffect } from 'react';
// Force Vite re-bundle: v2
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
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatPKR, capitalize } from '@/lib/utils';
import StatsCard from '@/components/StatsCard';
import QRScanner from '@/components/QRScanner';
import MemberTransferSkeleton from '@/components/MemberTransferSkeleton';

const MemberTransfer = () => {
  const [activeTab, setActiveTab] = useState('send'); // 'send' or 'receive'
  const [member, setMember] = useState(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    fetchMemberData();
  }, []);

  const fetchMemberData = async () => {
    try {
      const memberToken = localStorage.getItem('memberToken');
      const { data } = await api.get('/member-auth/me', {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      setMember(data);
    } catch (error) {
      console.error('Failed to fetch member data', error);
      toast.error('Failed to load profile');
    } finally {
      setPageLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    if (e) e.preventDefault();
    if (!recipient || !amount) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const memberToken = localStorage.getItem('memberToken');
      await api.post(
        '/members/portal/transfer',
        {
          recipientIdentifier: recipient.trim(),
          amount: parseFloat(amount),
          description,
        },
        {
          headers: { Authorization: `Bearer ${memberToken}` },
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

  const handleScanSuccess = (decodedText) => {
    // Expected format in QR: "wealthportal:email@example.com" or just "email@example.com"
    const cleanText = decodedText.replace('wealthportal:', '');
    setRecipient(cleanText);
    setShowScanner(false);
    toast.success('Member detected!');
  };

  const handleScanError = (error) => {
    // console.warn(error);
  };

  if (pageLoading) return <MemberTransferSkeleton />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={
          <>
            Instant <span className="text-primary ">Transfer</span>
          </>
        }
        description="Send funds to any member instantly using their email, phone, or QR code."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Current Balance"
          amount={formatPKR(member.currentBalance)}
          icon={<Wallet size={20} />}
          color="bg-primary shadow-primary/20"
          isGlass
        />
        <StatsCard
          title="Total Sent"
          amount={formatPKR(member.totalWithdrawn || 0)}
          icon={<Send size={20} />}
          color="bg-indigo-500 shadow-indigo-500/20"
          isGlass
        />
        <StatsCard
          title="Total Received"
          amount={formatPKR(member.totalInvested || 0)}
          icon={<TrendingUp size={20} />}
          color="bg-emerald-500 shadow-emerald-500/20"
          isGlass
        />
      </div>

      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Tab Switcher */}
        <div className="flex p-1.5 bg-muted/30 backdrop-blur-xl rounded-[2rem] border border-border/50 w-full max-w-md mx-auto relative z-10">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all duration-500 ${
              activeTab === 'send'
                ? 'bg-primary text-white shadow-xl shadow-primary/20'
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <Send size={16} />
            Send Money
          </button>
          <button
            onClick={() => setActiveTab('receive')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all duration-500 ${
              activeTab === 'receive'
                ? 'bg-primary text-white shadow-xl shadow-primary/20'
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <QrCode size={16} />
            Receive
          </button>
        </div>

        {activeTab === 'send' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Transfer Form */}
            <div className="bg-card/50 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-8 animate-in slide-in-from-left-4 duration-500">
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tighter">
                  New Transfer
                </h3>
                <p className="text-xs font-medium text-muted-foreground">
                  Secure fund movement between wealth accounts.
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
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="Email or Phone Number"
                        className="w-full pl-14 pr-6 py-4 rounded-2xl bg-muted/20 border border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-black text-sm"
                        required
                      />
                    </div>
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
                        className="w-full pl-14 pr-6 py-4 rounded-2xl bg-muted/20 border border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-black text-sm"
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
                  disabled={loading}
                  variant="gradient"
                  className="w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={18} />
                      Execute Transfer
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Scanning Logic */}
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
                    onScanError={handleScanError}
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
        ) : (
          <div className="max-w-md mx-auto space-y-8 animate-in zoom-in-95 duration-500">
            <div className="bg-white dark:bg-slate-900 border border-border/50 p-12 rounded-[3rem] shadow-2xl flex flex-col items-center gap-10 text-center relative overflow-hidden">
              {/* Decorative Background Icon */}
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
                  value={`wealthportal:${member.email}`}
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
                    Member Identifier
                  </span>
                  <span className="font-black text-primary">
                    {member.email}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <CheckCircle2 size={12} className="text-primary" />
                  Verified Wealth Account
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
      </div>
    </div>
  );
};

export default MemberTransfer;
