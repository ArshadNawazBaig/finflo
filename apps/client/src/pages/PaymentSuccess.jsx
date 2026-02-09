import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Fire confetti on mount
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const random = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-[85vh] w-full overflow-hidden flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative bg-background p-4 rounded-full border border-border shadow-2xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-primary">
            Payment Successful!
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Thank you for your purchase. Your account has been upgraded to Pro.
          </p>
        </div>

        <div className="pt-6">
          <Button
            asChild
            variant="gradient"
            className="px-8 py-3 rounded-full font-black uppercase tracking-widest text-[10px]"
          >
            <Link to="/dashboard">
              Go to Dashboard
              <ArrowRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>

        {sessionId && (
          <p className="text-[10px] text-muted-foreground font-mono opacity-50">
            ID: {sessionId.slice(0, 8)}...
          </p>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
