import { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Wallet,
  PiggyBank,
  Users,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
  Eye,
  EyeOff,
  TrendingUp,
  Coins,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';

const AccountOverviewCard = ({ member }) => {
  const [valuesVisible, setValuesVisible] = useState(false);
  const maskedValue = '******';

  const data = useMemo(() => {
    const currentBalance = member?.currentBalance || 0;
    const savingBalance = member?.savingBalance || 0;
    const shareBalance = member?.shareBalance || 0;
    const totalBalance = currentBalance + savingBalance + shareBalance;
    const totalDeposited = member?.totalInvested || 0;
    const savingProfit = member?.totalSavingProfit || 0;
    const creditLimit = member?.creditLimit || 0;

    // Membership duration
    const joinDate = member?.joinDate ? new Date(member.joinDate) : new Date();
    const now = new Date();
    const diffMs = now - joinDate;
    const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    let tenure;
    if (years >= 1) {
      tenure = `${years}y ${remainingMonths}m`;
    } else {
      tenure = `${months}m`;
    }

    // Account distribution for mini donut
    const accounts = [
      { label: 'Current', value: currentBalance, color: 'bg-primary', colorHex: '#6366f1' },
      { label: 'Saving', value: savingBalance, color: 'bg-teal-500', colorHex: '#14b8a6' },
      { label: 'Share', value: shareBalance, color: 'bg-amber-500', colorHex: '#f59e0b' },
    ];

    return {
      currentBalance,
      savingBalance,
      shareBalance,
      totalBalance,
      totalDeposited,
      savingProfit,
      creditLimit,
      tenure,
      months,
      accounts,
    };
  }, [member]);

  return (
    <div
      className="group relative rounded-[2rem] bg-card p-6 sm:p-8 transition-all duration-500 border border-slate-100 dark:border-white/[0.06] cursor-default shadow-xs"
      id="account-overview-card"
    >
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl shadow-inner text-white bg-gradient-to-br from-indigo-500 to-violet-600">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Account Overview
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Clock size={11} className="text-muted-foreground/60" />
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground/60">
                  Member for {data.tenure}
                </span>
              </div>
            </div>
          </div>
          <Tooltip
            content="Summary of your account balances across all accounts."
            position="left"
          >
            <div className="p-2 rounded-full cursor-help hover:bg-muted/50 transition-colors">
              <Info size={14} className="text-muted-foreground" />
            </div>
          </Tooltip>
        </div>

        {/* Total Balance */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
              Total Balance
            </p>
            <button
              type="button"
              onClick={() => setValuesVisible((v) => !v)}
              className="p-1 rounded-lg hover:bg-muted/50 active:scale-95 transition-all text-muted-foreground/50 hover:text-muted-foreground"
              aria-label={valuesVisible ? 'Hide values' : 'Show values'}
            >
              {valuesVisible ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
          </div>
          <span className="text-3xl sm:text-4xl font-black tracking-tighter tabular-nums">
            {valuesVisible ? formatCurrency(data.totalBalance) : maskedValue}
          </span>
        </div>

        {/* Account Bars */}
        <div className="space-y-3 mb-6">
          {data.accounts.map((acc) => {
            const pct = data.totalBalance > 0 ? (acc.value / data.totalBalance) * 100 : 0;
            return (
              <div key={acc.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', acc.color)} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      {acc.label}
                    </span>
                  </div>
                  <span className="text-xs font-black tabular-nums text-muted-foreground">
                    {valuesVisible ? formatCurrency(acc.value) : maskedValue}
                  </span>
                </div>
                <div className="h-2 w-full bg-muted/20 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-1000 ease-out',
                      acc.color,
                    )}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          {data.creditLimit > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              <Coins size={11} />
              <span>
                {valuesVisible ? formatCurrency(data.creditLimit) : maskedValue} limit
              </span>
            </div>
          )}
          {data.totalDeposited > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/20 text-[10px] font-bold text-muted-foreground">
              <ArrowDownLeft size={11} />
              <span>
                {valuesVisible ? formatCurrency(data.totalDeposited) : maskedValue} deposited
              </span>
            </div>
          )}
          {data.savingProfit > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-600">
              <TrendingUp size={11} />
              <span>
                {valuesVisible ? formatCurrency(data.savingProfit) : maskedValue} earned
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountOverviewCard;
