import { useAtomValue } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { subscriptionAtom, userAtom } from '@/atoms';
import { Button } from '@/components/ui/button';

const PlanLimitBanner = () => {
  const sub = useAtomValue(subscriptionAtom);
  const user = useAtomValue(userAtom);
  const navigate = useNavigate();

  if (sub.loading || !user || user.role !== 'admin' || sub.plan === 'Pro') {
    return null;
  }

  const limits = {
    loans: sub.limits?.loans ?? (sub.plan === 'Basic' ? 50 : 5),
    members: sub.limits?.members ?? (sub.plan === 'Basic' ? 3 : 1),
    branches: sub.limits?.branches ?? (sub.plan === 'Basic' ? 3 : 1),
  };

  const loanCount = sub.usage?.loans || 0;
  const memberCount = sub.usage?.members || 0;
  const branchCount = sub.usage?.branches || 0;

  const lu = Math.min(100, (loanCount / (limits.loans || 1)) * 100);
  const mu = Math.min(100, (memberCount / (limits.members || 1)) * 100);
  const bu = Math.min(100, (branchCount / (limits.branches || 1)) * 100);

  if (lu < 80 && mu < 80 && bu < 80) return null;

  const isAtLimit = lu >= 100 || mu >= 100 || bu >= 100;
  const primaryMetric = bu >= 80 ? 'branches' : mu >= 80 ? 'members' : 'loans';
  const current = bu >= 80 ? branchCount : mu >= 80 ? memberCount : loanCount;
  const limit =
    bu >= 80 ? limits.branches : mu >= 80 ? limits.members : limits.loans;
  const usagePct = bu >= 80 ? bu : mu >= 80 ? mu : lu;

  return (
    <div className="mb-8 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-6 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex-1">
        <h3 className="text-lg font-black text-foreground mb-1">
          {isAtLimit ? 'Plan Limit Reached' : 'Approaching Plan Limit'}
        </h3>
        <p className="text-sm text-muted-foreground font-medium mb-3">
          You&apos;re using{' '}
          <strong className="text-foreground">
            {current} of {limit}
          </strong>{' '}
          {primaryMetric} on your {sub.plan} plan.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-1000"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
          <Button
            onClick={() => navigate('/billing')}
            variant="gradient"
            className="px-6 h-auto py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap"
          >
            Upgrade Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlanLimitBanner;
