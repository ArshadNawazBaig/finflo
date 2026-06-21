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
  DollarSign,
  QrCode,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader className="flex-row items-start gap-3 space-y-0">
          <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
            {step === 1 ? <Wallet /> : <QrCode />}
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 dark:text-emerald-400 mb-1.5">
              {step === 1 ? 'Raast deposit' : 'QR payment'}
            </p>
            <DialogTitle>
              {step === 1 ? 'Add Funds via Raast' : 'Scan to Pay'}
            </DialogTitle>
            <DialogDescription className="mt-1">
              {step === 1
                ? 'Instantly top up your balance with 0% fees.'
                : 'Open your banking app and scan this Raast QR.'}
            </DialogDescription>
          </div>
        </DialogHeader>

        {step === 1 ? (
          <form onSubmit={handleInitiateDeposit} className="space-y-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="dep-amount"
                className="text-[11px] font-semibold text-slate-500 dark:text-slate-400"
              >
                Deposit Amount (PKR)
              </Label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary group-focus-within:scale-110 transition-transform">
                  <DollarSign size={18} strokeWidth={2.5} />
                </div>
                <Input
                  id="dep-amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-14 pl-12 pr-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-lg font-extrabold tracking-tight tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-white/[0.06] pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="h-11 px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={loading}
                disabled={!amount || Number(amount) <= 0}
                className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
              >
                Generate QR
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-5 animate-in zoom-in-95">
            <div className="p-6 bg-white rounded-2xl border border-slate-100 dark:border-white/[0.06]">
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
                <div className="w-[220px] h-[220px] flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-white/[0.02] animate-pulse rounded-xl">
                  Generating...
                </div>
              )}
            </div>

            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={12} />
              Waiting for payment confirmation...
            </div>

            <Button
              onClick={handleDone}
              className="w-full h-11 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
            >
              I have completed the payment
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MemberDepositModal;
