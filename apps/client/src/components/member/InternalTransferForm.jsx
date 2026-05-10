import { useState, useEffect } from 'react';
import { CheckCircle2, ArrowRight, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, capitalize } from '@/lib/utils';
import TransactionConfirmModal from '@/components/ui/TransactionConfirmModal';

const InternalTransferForm = ({ member, onSuccess, onScanQR, transactionToken }) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState('current');
  const [lookupData, setLookupData] = useState(null);
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTxnConfirm, setShowTxnConfirm] = useState(false);

  // Lookup internal recipient
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (recipient.length >= 3) {
        try {
          const { data } = await api.get(
            `/members/portal/lookup?identifier=${recipient}`,
          );
          // Filter out current user
          const filtered = data.filter((m) => m._id !== member?._id);
          setResults(filtered);
          setShowDropdown(filtered.length > 0);

          // Auto-select if exact match found (email or ID)
          const exactMatch = filtered.find(
            (m) =>
              m.email.toLowerCase() === recipient.toLowerCase() ||
              m.memberId === recipient,
          );
          if (exactMatch) {
            setLookupData(exactMatch);
          }
        } catch (e) {
          setResults([]);
          setShowDropdown(false);
        }
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [recipient, member]);

  // Handle QR scan auto-fill
  useEffect(() => {
    const handleQRScan = async (e) => {
      const { recipientId, recipientName } = e.detail;
      if (recipientId) {
        try {
          const { data } = await api.get(
            `/members/portal/lookup?identifier=${recipientId}`,
          );
          const match = data.find((m) => m._id === recipientId);
          if (match) {
            setLookupData(match);
            setRecipient(match.email || match.name);
          } else if (recipientName) {
            setRecipient(recipientName);
          }
        } catch {
          if (recipientName) setRecipient(recipientName);
        }
      }
    };

    window.addEventListener('finflo:qr-scan', handleQRScan);
    return () => window.removeEventListener('finflo:qr-scan', handleQRScan);
  }, []);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!lookupData) return toast.error('Valid recipient required');
    if (!amount || isNaN(amount) || amount <= 0)
      return toast.error('Enter a valid amount');
    const availableBalance = accountType === 'current' ? member?.currentBalance : member?.savingBalance;
    if (amount > availableBalance)
      return toast.error(`Insufficient ${accountType} funds`);
    setShowTxnConfirm(true);
  };

  const executeTransfer = async () => {
    setShowTxnConfirm(false);
    setLoading(true);
    try {
      await api.post('/members/portal/transfer', {
        recipientId: lookupData._id,
        amount: parseFloat(amount),
        accountType,
        description: note || `Transfer to ${lookupData.name}`,
      }, transactionToken ? { headers: { 'x-transaction-token': transactionToken } } : undefined);
      toast.success('Transfer sent successfully!');
      setAmount('');
      setNote('');
      setRecipient('');
      setLookupData(null);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <form onSubmit={handleTransfer} className="space-y-6 relative z-10 w-full">
      <div>
        <h3 className="text-2xl font-black tracking-tighter">Send to Member</h3>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Instant, zero-fee transfers between Finflo accounts.
        </p>
      </div>

      <div className="space-y-6 bg-muted/20 p-6 rounded-[2rem] border border-border/40">
        <div className="flex gap-2 p-1 bg-muted/30 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setAccountType('current')}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              accountType === 'current'
                ? 'bg-primary text-white shadow-lg'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Current
          </button>
          <button
            type="button"
            onClick={() => setAccountType('saving')}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              accountType === 'saving'
                ? 'bg-teal-500 text-white shadow-lg'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Saving
          </button>
        </div>

        <div className="space-y-2 text-left">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
              Recipient Email or Finflo ID
            </label>
            {onScanQR && (
              <button
                type="button"
                onClick={onScanQR}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <ScanLine size={12} />
                Scan QR
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              placeholder="Search by Email, ID or CNIC"
              className="h-14 rounded-2xl bg-background border-border/50 text-base px-6 shadow-none"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
            />

            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                {results.map((res) => (
                  <button
                    key={res._id}
                    type="button"
                    onClick={() => {
                      setLookupData(res);
                      setRecipient(res.email);
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

          {lookupData && (
            <div className="mx-2 mt-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-600 capitalize">
                  {lookupData.name}
                </p>
                <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest">
                  {lookupData.memberId || 'VERIFIED'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 text-left">
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              max={accountType === 'current' ? (member?.currentBalance || 0) : (member?.savingBalance || 0)}
            />
          </div>
        </div>

        <div className="space-y-2 text-left">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
            Note (Optional)
          </label>
          <Input
            placeholder="What's this for?"
            className="h-14 rounded-2xl bg-background border-border/50 text-sm px-6 shadow-none"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || !lookupData || !amount}
        className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98]"
      >
        {loading ? 'Processing...' : 'Send Funds Instantly'}
        {!loading && <ArrowRight size={16} />}
      </Button>
    </form>

    {/* Transaction Confirmation */}
    <TransactionConfirmModal
      isOpen={showTxnConfirm}
      onClose={() => setShowTxnConfirm(false)}
      onConfirm={executeTransfer}
      loading={loading}
      type="transfer"
      amount={parseFloat(amount) || 0}
      details={[
        { label: 'To', value: capitalize(lookupData?.name || '') },
        { label: 'Account', value: accountType === 'saving' ? 'Saving' : 'Current' },
        { label: 'Recipient ID', value: lookupData?.memberId || '' },
      ]}
      description={note || undefined}
    />
    </>
  );
};

export default InternalTransferForm;
