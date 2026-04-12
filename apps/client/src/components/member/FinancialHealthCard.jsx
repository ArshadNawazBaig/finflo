import { useMemo } from 'react';
import {
  HeartPulse,
  Wallet,
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const FinancialHealthCard = ({ member, activeLoansCount = 0 }) => {
  const metrics = useMemo(() => {
    const currentBalance = member?.currentBalance || 0;
    const savingBalance = member?.savingBalance || 0;
    const totalInvested = member?.totalInvested || 0;
    const savingProfit = member?.totalSavingProfit || 0;
    const creditLimit = member?.creditLimit || 0;
    const loanRemaining = member?.activeLoan?.remainingAmount || 0;
    const loanTotal = member?.activeLoan?.totalAmount || 0;

    // Net worth = current + savings minus liabilities
    const totalAssets = currentBalance + savingBalance;
    const netWorth = totalAssets - loanRemaining;

    // Debt ratio: how much of your assets is owed
    const debtRatio =
      totalAssets > 0 ? Math.round((loanRemaining / totalAssets) * 100) : 0;

    // Savings ratio: savings as % of total assets
    const savingsRatio =
      totalAssets > 0
        ? Math.round(((savingBalance + totalInvested) / totalAssets) * 100)
        : 0;

    // Credit utilization: loan remaining vs credit limit
    const creditUtilization =
      creditLimit > 0 ? Math.round((loanRemaining / creditLimit) * 100) : 0;

    // Overall health score (simple weighted formula)
    let healthScore = 50; // base
    // Low debt ratio is good
    if (debtRatio <= 10) healthScore += 20;
    else if (debtRatio <= 30) healthScore += 10;
    else if (debtRatio > 60) healthScore -= 15;

    // High savings ratio is good
    if (savingsRatio >= 50) healthScore += 15;
    else if (savingsRatio >= 30) healthScore += 8;

    // Positive net worth is good
    if (netWorth > 0) healthScore += 10;
    else healthScore -= 10;

    // No active loans is good
    if (activeLoansCount === 0) healthScore += 5;

    healthScore = Math.min(100, Math.max(0, healthScore));

    let status, statusColor, statusIcon;
    if (healthScore >= 75) {
      status = 'Excellent';
      statusColor = 'text-emerald-500';
      statusIcon = CheckCircle2;
    } else if (healthScore >= 50) {
      status = 'Good';
      statusColor = 'text-primary';
      statusIcon = CheckCircle2;
    } else if (healthScore >= 30) {
      status = 'Fair';
      statusColor = 'text-amber-500';
      statusIcon = AlertTriangle;
    } else {
      status = 'Needs Attention';
      statusColor = 'text-red-500';
      statusIcon = AlertTriangle;
    }

    return {
      netWorth,
      debtRatio,
      savingsRatio,
      creditUtilization,
      healthScore,
      status,
      statusColor,
      statusIcon,
      totalAssets,
      loanRemaining,
    };
  }, [member, activeLoansCount]);

  const StatusIcon = metrics.statusIcon;

  const indicators = [
    {
      label: 'Debt Ratio',
      value: `${metrics.debtRatio}%`,
      max: 100,
      current: metrics.debtRatio,
      color:
        metrics.debtRatio <= 30
          ? 'bg-emerald-500'
          : metrics.debtRatio <= 60
            ? 'bg-amber-500'
            : 'bg-red-500',
      good: metrics.debtRatio <= 30,
    },
    {
      label: 'Savings Ratio',
      value: `${metrics.savingsRatio}%`,
      max: 100,
      current: metrics.savingsRatio,
      color:
        metrics.savingsRatio >= 50
          ? 'bg-emerald-500'
          : metrics.savingsRatio >= 30
            ? 'bg-primary'
            : 'bg-amber-500',
      good: metrics.savingsRatio >= 30,
    },
    {
      label: 'Credit Usage',
      value: `${Math.min(metrics.creditUtilization, 100)}%`,
      max: 100,
      current: Math.min(metrics.creditUtilization, 100),
      color:
        metrics.creditUtilization <= 30
          ? 'bg-emerald-500'
          : metrics.creditUtilization <= 70
            ? 'bg-amber-500'
            : 'bg-red-500',
      good: metrics.creditUtilization <= 30,
    },
  ];

  return (
    <div
      className="group relative rounded-[2rem] bg-card p-6 sm:p-8 transition-all duration-500 border border-border/50 cursor-default shadow-xs"
      id="financial-health-card"
    >
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl shadow-inner text-white bg-gradient-to-br from-emerald-500 to-teal-500">
              <HeartPulse size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Financial Health
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusIcon size={12} className={metrics.statusColor} />
                <span
                  className={cn(
                    'text-xs font-black uppercase tracking-wider',
                    metrics.statusColor,
                  )}
                >
                  {metrics.status}
                </span>
              </div>
            </div>
          </div>
          <Tooltip
            content="Summary of your overall financial position."
            position="left"
          >
            <div className="p-2 rounded-full cursor-help hover:bg-muted/50 transition-colors">
              <Info size={14} className="text-muted-foreground" />
            </div>
          </Tooltip>
        </div>

        {/* Net Worth Section */}
        <div className="mb-6">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">
            Estimated Net Worth
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'text-3xl sm:text-4xl font-black tracking-tighter tabular-nums',
                metrics.netWorth >= 0 ? 'text-foreground' : 'text-red-500',
              )}
            >
              {formatCurrency(metrics.netWorth)}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
              <Wallet size={11} className="text-primary" />
              <span>Assets: {formatCurrency(metrics.totalAssets)}</span>
            </div>
            {metrics.loanRemaining > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                <TrendingUp size={11} className="text-red-400" />
                <span>
                  Debt: {formatCurrency(metrics.loanRemaining)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Indicator Bars */}
        <div className="space-y-4">
          {indicators.map((ind) => (
            <div key={ind.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  {ind.label}
                </span>
                <span
                  className={cn(
                    'text-xs font-black tabular-nums',
                    ind.good
                      ? 'text-emerald-500'
                      : 'text-muted-foreground',
                  )}
                >
                  {ind.value}
                </span>
              </div>
              <div className="h-2 w-full bg-muted/20 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-1000 ease-out',
                    ind.color,
                  )}
                  style={{ width: `${ind.current}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Summary Row */}
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/20 text-[10px] font-bold text-muted-foreground">
            <PiggyBank size={11} />
            <span>{formatCurrency(member?.savingBalance || 0)} saved</span>
          </div>
          {activeLoansCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/20 text-[10px] font-bold text-muted-foreground">
              <AlertTriangle size={11} />
              <span>
                {activeLoansCount} active loan{activeLoansCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
          {member?.totalSavingProfit > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-600">
              <TrendingUp size={11} />
              <span>
                {formatCurrency(member.totalSavingProfit)} profit
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialHealthCard;
