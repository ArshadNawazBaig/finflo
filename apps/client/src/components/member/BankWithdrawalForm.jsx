import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { BANKS } from '@/constants/banks';
import ComingSoon from '@/components/ui/ComingSoon';

const BankWithdrawalForm = ({ member, onSuccess }) => {
  const [bank, setBank] = useState('');
  const [account, setAccount] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [titleLoading, setTitleLoading] = useState(false);
  const [isTitleVerified, setIsTitleVerified] = useState(false);

  // Lookup External Account Title
  useEffect(() => {
    const fetchTitle = async () => {
      if (!bank || account.length < 10) {
        setIsTitleVerified(false);
        if (accountTitle && isTitleVerified) setAccountTitle('');
        return;
      }

      setTitleLoading(true);
      try {
        const { data } = await api.post('/external-transfers/resolve-title', {
          bankCode: bank,
          accountIdentifier: account,
        });

        if (data.success && data.accountTitle) {
          setAccountTitle(data.accountTitle);
          setIsTitleVerified(true);
          toast.success(`Account Verified: ${data.accountTitle}`);
        } else {
          setIsTitleVerified(false);
          toast.error('Could not verify account title. Please type manually.');
        }
      } catch (error) {
        setIsTitleVerified(false);
        toast.error(
          error.response?.data?.message ||
            'Title verification failed. Proceed with caution.',
        );
      } finally {
        setTitleLoading(false);
      }
    };

    const timeout = setTimeout(fetchTitle, 1000);
    return () => clearTimeout(timeout);
  }, [account, bank, isTitleVerified, accountTitle]);

  const handleWithdrawal = async (e) => {
    e.preventDefault();
    if (!bank || !account || !accountTitle)
      return toast.error('All bank details are required');
    if (!amount || isNaN(amount) || amount <= 0)
      return toast.error('Enter a valid amount');
    if (parseFloat(amount) > member?.currentBalance)
      return toast.error('Insufficient funds');

    setLoading(true);
    try {
      const selectedInst = BANKS.find((b) => b.id === bank);
      await api.post('/external-transfers', {
        bankName: selectedInst.label,
        accountIdentifier: account,
        accountTitle: accountTitle,
        amount: parseFloat(amount),
        direction: 'send',
      });
      toast.success('Withdrawal request submitted!');
      setAmount('');
      setAccount('');
      setAccountTitle('');
      setBank('');
      setIsTitleVerified(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center">
      <ComingSoon
        icon={Building2}
        title="Withdrawals Coming Soon"
        description="We're currently finalizing our integration with local banking networks to ensure lightning-fast and secure withdrawals. Stay tuned!"
        badges={['JazzCash', 'EasyPaisa', 'NayaPay', 'All Major Banks']}
      />

      {/* 
      <form
        onSubmit={handleWithdrawal}
        className="space-y-6 relative z-10 w-full text-left mt-10"
      >
        <div>
          <h3 className="text-2xl font-black tracking-tighter">
            Withdraw to Bank / Raast
          </h3>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Transfer funds out to your personal bank account or mobile wallet.
          </p>
        </div>

        <div className="space-y-6 bg-muted/20 p-6 rounded-[2rem] border border-border/40">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
              Destinaton Bank
            </label>
            <BankSelector selectedId={bank} onSelect={setBank} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                IBAN / Raast ID
              </label>
              <Input
                placeholder="PK... or 03..."
                className="h-14 rounded-2xl bg-background border-border/50 px-6 shadow-none"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                Account Title
              </label>
              <div className="relative">
                <Input
                  placeholder={
                    titleLoading ? 'Fetching name...' : 'Account Holder Name'
                  }
                  className={cn(
                    'h-14 rounded-2xl bg-background border-border/50 px-6 shadow-none uppercase transition-all',
                    isTitleVerified &&
                      'border-emerald-500/50 bg-emerald-500/5 text-emerald-600 font-bold',
                    titleLoading && 'opacity-50',
                  )}
                  value={accountTitle}
                  onChange={(e) =>
                    setAccountTitle(e.target.value.toUpperCase())
                  }
                  disabled={titleLoading || isTitleVerified}
                  required
                />
                {titleLoading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {isTitleVerified && !titleLoading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
                    <CheckCircle2 size={16} />
                  </div>
                )}
              </div>
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1"
                max={member?.currentBalance || 0}
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !bank || !account || !accountTitle || !amount}
          className="w-full h-14 rounded-2xl bg-foreground text-background hover:bg-neutral-800 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98]"
        >
          {loading ? 'Processing...' : 'Request Bank Withdrawal'}
          {!loading && <ArrowRight size={16} />}
        </Button>
      </form> */}
    </div>
  );
};

export default BankWithdrawalForm;
