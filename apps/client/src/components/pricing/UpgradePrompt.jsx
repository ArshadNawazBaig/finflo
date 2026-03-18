import { Link } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const UpgradePrompt = ({ isOpen, onClose, plan, limit, current, feature }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const getUpgradeMessage = () => {
    if (feature === 'loans') {
      return `You've reached your ${plan} plan limit of ${limit} loans.`;
    }
    if (feature === 'users') {
      return `You've reached your ${plan} plan limit of ${limit} user(s).`;
    }
    return `This feature requires a higher plan.`;
  };

  const getRecommendedPlan = () => {
    if (plan === 'Free') return 'Basic';
    if (plan === 'Basic') return 'Pro';
    return 'Pro';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="p-0">
          <div className="flex items-center justify-between mb-2 p-0 sm:p-0">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-500">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-2xl font-black">
                  Upgrade Required
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-sm font-medium">
                  Unlock more with a higher plan
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4 p-0 sm:px-0">
          {/* Current Status */}
          <div className="p-3 sm:p-4 rounded-xl bg-muted/50 border border-border/50 text-left">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 sm:mb-2">
              Current Status
            </p>
            <p className="text-sm sm:text-base font-semibold text-foreground">
              {getUpgradeMessage()}
            </p>
            {current !== undefined && limit !== undefined && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] sm:text-xs font-bold mb-1.5">
                  <span className="text-muted-foreground">Usage</span>
                  <span className="text-foreground">
                    {current} / {limit}
                  </span>
                </div>
                <div className="h-1.5 sm:h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                    style={{
                      width: `${Math.min(100, (current / limit) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Upgrade CTA */}
          <div className="space-y-3 p-0 pb-0 sm:pb-0">
            {isAdmin ? (
              <Button
                variant="gradient"
                asChild
                className="w-full px-5 sm:px-6 py-2.5 sm:py-3 rounded-full flex items-center justify-center gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-widest"
              >
                <Link to="/pricing" onClick={onClose}>
                  View Pricing Plans
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Link>
              </Button>
            ) : (
              <Button
                disabled
                variant="outline"
                className="w-full px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest opacity-70 cursor-not-allowed border-amber-500/50 text-amber-600 dark:text-amber-400"
              >
                Contact Admin to Upgrade
              </Button>
            )}
            <button
              onClick={onClose}
              className="w-full border border-border bg-background hover:bg-muted px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePrompt;
