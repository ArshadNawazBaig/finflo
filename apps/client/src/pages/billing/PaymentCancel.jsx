import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

const PaymentCancel = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl" />
          <div className="relative bg-background p-6 rounded-full border border-border shadow-2xl">
            <XCircle className="w-16 h-16 text-destructive" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tight text-foreground">
            Payment Cancelled
          </h1>
          <p className="text-muted-foreground text-lg">
            Your payment process was cancelled or failed. No charges were made
            to your account.
          </p>
        </div>

        <div className="pt-8 flex flex-col gap-4">
          <Link
            to="/pricing"
            className="inline-flex justify-center items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-primary/25"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Link>

          <Link
            to="/dashboard"
            className="inline-flex justify-center items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
