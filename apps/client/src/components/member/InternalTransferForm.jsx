import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, ArrowRight, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import MemberAvatar from '@/components/member/MemberAvatar';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, capitalize } from '@/lib/utils';
import TransactionConfirmModal from '@/components/ui/TransactionConfirmModal';

const InternalTransferForm = ({ member, onSuccess, onScanQR }) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState('current');
  const [lookupData, setLookupData] = useState(null);
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showTxnConfirm, setShowTxnConfirm] = useState(false);

  // When we set `recipient` programmatically (clicking a result, QR scan
  // auto-fill), we don't want the lookup effect to immediately fire another
  // search using the inserted name/email and re-open the dropdown.
  const skipNextLookupRef = useRef(false);

  // Lookup internal recipient
  useEffect(() => {
    if (skipNextLookupRef.current) {
      skipNextLookupRef.current = false;
      return;
    }
    if (recipient.length < 3) {
      setResults([]);
      setShowDropdown(false);
      setSearching(false);
      return;
    }
    // Show the dropdown immediately so the skeleton appears during the debounce
    // window — otherwise the user sees nothing for ~500ms after typing.
    setSearching(true);
    setShowDropdown(true);
    const timeout = setTimeout(async () => {
      try {
        const { data } = await api.get(
          // Must encode — common identifiers (emails with `+`, phone numbers
          // with spaces, etc.) decode to wrong values server-side otherwise.
          `/members/portal/lookup?identifier=${encodeURIComponent(recipient)}`,
        );
        // Filter out current user
        const filtered = data.filter((m) => m._id !== member?._id);
        setResults(filtered);
        setShowDropdown(true);

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
      } finally {
        setSearching(false);
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
            `/members/portal/lookup?identifier=${encodeURIComponent(recipientId)}`,
          );
          const match = data.find((m) => m._id === recipientId);
          if (match) {
            setLookupData(match);
            skipNextLookupRef.current = true;
            setRecipient(match.name || match.email);
          } else if (recipientName) {
            skipNextLookupRef.current = true;
            setRecipient(recipientName);
          }
        } catch {
          if (recipientName) {
            skipNextLookupRef.current = true;
            setRecipient(recipientName);
          }
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
    const availableBalance =
      accountType === 'current'
        ? member?.currentBalance
        : member?.savingBalance;
    if (amount > availableBalance)
      return toast.error(`Insufficient ${accountType} funds`);
    setShowTxnConfirm(true);
  };

  const executeTransfer = async (token) => {
    console.log(
      '[Transfer] executeTransfer called with token:',
      token ? 'present' : 'missing',
    );
    console.log('[Transfer] lookupData:', lookupData);
    console.log('[Transfer] amount:', amount, 'accountType:', accountType);
    setLoading(true);
    try {
      console.log('[Transfer] Making API call...');
      await api.post(
        '/members/portal/transfer',
        {
          recipientId: lookupData._id,
          amount: parseFloat(amount),
          accountType,
          description: note || `Transfer to ${lookupData.name}`,
        },
        {
          headers: {
            ...(token ? { 'x-transaction-token': token } : {}),
          },
        },
      );
      console.log('[Transfer] API call succeeded');
      toast.success('Transfer sent successfully!');
      setShowTxnConfirm(false);
      setAmount('');
      setNote('');
      setRecipient('');
      setLookupData(null);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('[Transfer] API call failed:', error);
      toast.error(error.response?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form
        onSubmit={handleTransfer}
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
            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
              Recipient Name
            </label>
            <div className="relative">
              <Input
                placeholder="Search by Email, ID or CNIC"
                className="h-14 rounded-2xl bg-background border-border/50 text-base px-6 pr-14 shadow-none"
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  // User is editing — drop any previously verified selection
                  // so the green confirmation card doesn't lie about who's
                  // about to receive funds.
                  if (lookupData) setLookupData(null);
                }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                onFocus={() => results.length > 0 && setShowDropdown(true)}
              />
              {onScanQR && (
                <button
                  type="button"
                  onClick={onScanQR}
                  aria-label="Scan QR code"
                  title="Scan QR code"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-all"
                >
                  <ScanLine size={16} />
                </button>
              )}

              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
                  {searching ? (
                    // Skeleton rows mirror the real row layout: avatar + name + meta
                    Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={`s-${i}`}
                        className="w-full px-6 py-4 flex items-center gap-3 border-b border-border/10 last:border-none animate-pulse"
                      >
                        <Skeleton className="h-10 w-10 rounded-2xl shrink-0 bg-muted/40" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3.5 w-32 rounded bg-muted/40" />
                          <Skeleton className="h-2.5 w-44 rounded bg-muted/30" />
                        </div>
                      </div>
                    ))
                  ) : results.length === 0 ? (
                    <div className="px-6 py-5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      No members found
                    </div>
                  ) : (
                    results.map((res) => (
                      <button
                        key={res._id}
                        type="button"
                        onClick={() => {
                          setLookupData(res);
                          skipNextLookupRef.current = true;
                          setRecipient(res.name);
                          setShowDropdown(false);
                          setResults([]);
                        }}
                        className="w-full px-6 py-4 flex items-center gap-3 hover:bg-muted/50 transition-colors border-b border-border/10 last:border-none text-left"
                      >
                        <MemberAvatar
                          name={res.name}
                          profilePicture={res.profilePicture}
                          size={40}
                          rounded="rounded-2xl"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground capitalize truncate">
                            {res.name}
                          </p>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest truncate">
                            CNIC: {res.cnic || 'N/A'} • {res.memberId}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {lookupData && (
              <div className="mx-2 mt-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                <div className="relative shrink-0">
                  <MemberAvatar
                    name={lookupData.name}
                    profilePicture={lookupData.profilePicture}
                    size={40}
                    rounded="rounded-full"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-background">
                    <CheckCircle2 size={12} strokeWidth={3} />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-emerald-600 capitalize truncate">
                    {lookupData.name}
                  </p>
                  <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest truncate">
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
                max={
                  accountType === 'current'
                    ? member?.currentBalance || 0
                    : member?.savingBalance || 0
                }
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
          {
            label: 'Account',
            value: accountType === 'saving' ? 'Saving' : 'Current',
          },
          { label: 'Recipient ID', value: lookupData?.memberId || '' },
        ]}
        description={note || undefined}
      />
    </>
  );
};

export default InternalTransferForm;
