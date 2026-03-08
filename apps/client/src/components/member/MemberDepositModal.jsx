import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  Loader2,
  DollarSign,
  QrCode,
  CheckCircle2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/lib/axios';
import { toast } from 'sonner';

const MemberDepositModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Amount input, 2: Show QR
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [qrData, setQrData] = useState(null);

  const handleInitiateDeposit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/members/portal/raast-deposit', {
        amount: Number(amount),
      });
      // Expected backend response: { success: true, data: { qrCode: "..." } }
      if (data.success && data.data?.qrCode) {
        setQrData(data.data.qrCode);
        setStep(2);
      } else {
        throw new Error('QR not generated');
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to initiate deposit',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    // Reset and close
    setStep(1);
    setAmount('');
    setQrData(null);
    onSuccess(); // Refresh parent balance
    onClose();
    toast.success(
      'We will update your balance as soon as the bank confirms the payment.',
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setStep(1);
          setAmount('');
          setQrData(null);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[450px] !p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-8">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
                {step === 1 ? (
                  <Wallet className="w-8 h-8" />
                ) : (
                  <QrCode className="w-8 h-8" />
                )}
              </div>
              <div className="text-left">
                <DialogTitle className="text-2xl font-black tracking-tight">
                  {step === 1 ? 'Add Funds via Raast' : 'Scan to Pay'}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium">
                  {step === 1
                    ? 'Instantly top up your balance with 0% fees.'
                    : 'Open your banking app and scan this Raast QR.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {step === 1 ? (
            <form onSubmit={handleInitiateDeposit} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="dep-amount"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
                  Deposit Amount (PKR)
                </Label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary group-focus-within:scale-110 transition-transform">
                    <DollarSign size={20} strokeWidth={3} />
                  </div>
                  <Input
                    id="dep-amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-16 pl-14 pr-6 rounded-2xl border-none bg-muted/50 text-xl font-black focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  isLoading={loading}
                  disabled={!amount || Number(amount) <= 0}
                  className="flex-[2] h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all group"
                >
                  <div className="flex items-center gap-2">Generate QR</div>
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-6 animate-in zoom-in-95">
              <div className="p-6 bg-white rounded-3xl shadow-inner border border-muted">
                {qrData ? (
                  <QRCodeSVG
                    value={qrData}
                    size={220}
                    level="H"
                    imageSettings={{
                      src: '/logo.svg',
                      height: 40,
                      width: 40,
                      excavate: true,
                    }}
                  />
                ) : (
                  <div className="w-[220px] h-[220px] flex items-center justify-center text-muted-foreground bg-muted/20 animate-pulse rounded-xl">
                    Generating...
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                <CheckCircle2 size={16} />
                <span className="text-xs font-bold">
                  Waiting for payment confirmation...
                </span>
              </div>

              <Button
                onClick={handleDone}
                variant="outline"
                className="w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest mt-2 border-border/50"
              >
                I have completed the payment
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberDepositModal;
