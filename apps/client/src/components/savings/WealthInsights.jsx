import { TrendingUp, TrendingDown, CreditCard, Landmark } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const WealthInsights = ({ member, loans = [], goals = [] }) => {
  const currentBalance = member?.currentBalance || 0;
  const totalInvested = member?.totalInvested || 0;
  const totalProfit = member?.totalProfit || 0;

  const totalLiabilities = loans
    .filter((l) => l.status === 'active')
    .reduce((sum, l) => sum + (l.remainingAmount || l.totalAmount), 0);

  const netWorth = currentBalance - totalLiabilities;
  const isPositive = netWorth >= 0;

  const generateInsight = () => {
    const profitPercentage =
      totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(1) : 0;

    // Find a goal to suggest
    const pendingGoals = goals.filter((g) => g.status !== 'completed');
    const emergencyGoal = pendingGoals.find(
      (g) => g.category.toLowerCase() === 'emergency',
    );
    const priorityGoal = emergencyGoal || pendingGoals[0];

    if (netWorth < 0) {
      return `Your liabilities exceed your current assets. Focusing on clearing high-interest debt could improve your financial health.`;
    }

    if (profitPercentage > 0) {
      let msg = `Your assets have increased by ${profitPercentage}% through profits.`;
      if (priorityGoal) {
        msg += ` Consider allocating more to your '${priorityGoal.title}' goal.`;
      } else {
        msg += ` Great job! Consider setting a new savings goal to keep the momentum going.`;
      }
      return msg;
    }

    if (priorityGoal) {
      return `Consistency is key! You are ${priorityGoal.progress}% of the way to your '${priorityGoal.title}' goal. Keep going!`;
    }

    return 'Stay focused on your financial journey. Regularly investing and managing loans will build a secure financial future.';
  };

  const stats = [
    {
      label: 'Total Assets',
      value: formatCurrency(currentBalance),
      icon: <Landmark className="text-emerald-500" size={20} />,
      description: 'Investment Balance + Profits',
    },
    {
      label: 'Current Liabilities',
      value: formatCurrency(totalLiabilities),
      icon: <CreditCard className="text-red-500" size={20} />,
      description: 'Active Loan Balances',
    },
  ];

  const businessName = member?.user?.businessName || 'FinFlo';

  return (
    <div className="bg-card rounded-[2.5rem] border border-border/50 shadow-sm overflow-hidden">
      <div className="p-8 sm:p-10 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div>
            <h3 className="text-2xl font-black tracking-tighter mb-1">
              {businessName} Insights
            </h3>
            <p className="text-sm font-medium text-muted-foreground">
              Detailed breakdown of your financial health
            </p>
          </div>
          <div
            className={`px-6 py-4 rounded-3xl border ${isPositive ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'} flex items-center gap-4`}
          >
            <div
              className={`p-3 rounded-full ${isPositive ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'}`}
            >
              {isPositive ? (
                <TrendingUp size={24} />
              ) : (
                <TrendingDown size={24} />
              )}
            </div>
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-widest opacity-60 mb-0.5">
                Estimated Net Worth
              </p>
              <p
                className={`text-lg font-black tracking-tighter ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {formatCurrency(netWorth)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="p-6 rounded-[2rem] bg-background/50 border border-border/40 hover:border-primary/20 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-card rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                  {stat.icon}
                </div>
              </div>
              <div>
                <p className="text-xl font-black tracking-tighter mb-1">
                  {stat.value}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">{stat.label}</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.description}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-8 border-t border-border/40 flex items-center gap-6">
          <div className="flex -space-x-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full border-4 border-card bg-muted flex items-center justify-center overflow-hidden"
              >
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Financial${i}`}
                  alt="Advisor"
                />
              </div>
            ))}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold tracking-tight ">
              "{generateInsight()}"
            </p>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">
              — AI {businessName} Advisor
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WealthInsights;
