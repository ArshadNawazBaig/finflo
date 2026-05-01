import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import axios from '@/lib/axios';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [planName, setPlanName] = useState('Pro');

  // Verify and sync subscription status
  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) return;

      try {
        // Call backend to verify session and update user plan
        const response = await axios.post('/subscription/verify-session', {
          sessionId,
        });

        if (response.data.plan) {
          setPlanName(response.data.plan);

          // Fetch updated user data and update localStorage
          try {
            const userResponse = await axios.get('/auth/me');
            const updatedUser = userResponse.data;

            // Update localStorage with new user data
            localStorage.setItem('user', JSON.stringify(updatedUser));

            // Dispatch custom event to notify other components
            window.dispatchEvent(new Event('userUpdated'));

            console.log('User data updated in localStorage:', updatedUser.plan);
          } catch (userError) {
            console.error('Error fetching updated user data:', userError);
          }
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
      }
    };

    verifyPayment();
  }, [sessionId]);

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
    <div className="min-h-[85vh] w-full flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-700 ease-out">
        
        {/* Elegant Icon */}
        <div className="relative mb-8 flex items-center justify-center mt-4">
          <div className="absolute w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl animate-pulse duration-3000" />
          <div className="absolute w-24 h-24 bg-emerald-400/20 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="relative w-20 h-20 bg-background border-2 border-emerald-100 dark:border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <CheckCircle2 className="w-10 h-10" strokeWidth={2.5} />
          </div>
        </div>

        {/* Typography */}
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground mb-4">
          Payment <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">Successful</span>
        </h1>
        
        <p className="text-base text-muted-foreground max-w-sm mx-auto mb-10 font-medium leading-relaxed">
          Thank you for your purchase. Your account is now on the <span className="text-foreground font-bold">{planName}</span> plan.
        </p>

        {/* Action Button */}
        <Button 
          asChild 
          className="h-12 px-10 rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 mb-10"
        >
          <Link to="/dashboard">
            Go to Dashboard
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>

        {/* Subtle Details */}
        {sessionId && (
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground opacity-60 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Status: Completed
            </div>
            <p className="font-mono tracking-wider uppercase">
              ID: {sessionId.slice(0, 16)}...
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default PaymentSuccess;
