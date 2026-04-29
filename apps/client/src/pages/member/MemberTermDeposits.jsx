import { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  CalendarDays,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import { cn, formatCurrency } from '@/lib/utils';
import api from '@/lib/axios';
import { toast } from 'sonner';
import EmptyState from '@/components/ui/EmptyState';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';

const MemberTermDeposits = () => {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchDeposits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/term-deposits/portal/my-deposits');
      setDeposits(res.data || []);
    } catch (error) {
      console.error('Failed to fetch term deposits:', error);
      toast.error('Failed to load term deposits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  // Derived Stats
  const activeDeposits = deposits.filter((d) => d.status === 'active');
  const totalActivePrincipal = activeDeposits.reduce((sum, d) => sum + d.principal, 0);
  const totalProjectedProfit = activeDeposits.reduce((sum, d) => sum + d.projectedProfit, 0);
  
  const maturedDeposits = deposits.filter((d) => d.status === 'matured');
  const totalMaturedProfit = maturedDeposits.reduce((sum, d) => sum + (d.actualProfit || d.projectedProfit), 0);

  const filteredDeposits = deposits.filter((d) => 
    d.depositNumber?.toLowerCase().includes(search.toLowerCase()) ||
    d.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      <PageHeader
        title="Term Deposits"
        description="Monitor your locked savings, track maturity dates, and view projected profits."
      />

      {loading ? (
        <CardsSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Active Locked Savings"
            amount={formatCurrency(totalActivePrincipal)}
            icon={<Lock size={20} />}
            color="bg-primary shadow-primary/20"
            subtitle={`${activeDeposits.length} active term deposits`}
          />
          <StatsCard
            title="Projected Profit"
            amount={formatCurrency(totalProjectedProfit)}
            icon={<TrendingUp size={20} />}
            color="bg-indigo-500 shadow-indigo-500/20"
            subtitle="Expected earnings on maturity"
          />
          <StatsCard
            title="Realized Profit"
            amount={formatCurrency(totalMaturedProfit)}
            icon={<CheckCircle2 size={20} />}
            color="bg-emerald-500 shadow-emerald-500/20"
            subtitle={`${maturedDeposits.length} matured deposits`}
          />
        </div>
      )}

      {/* Main List */}
      <div className="bg-card rounded-[2.5rem] border border-border/50 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-muted rounded-xl">
              <Lock size={20} className="text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Deposit Portfolio</h2>
          </div>
          
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search deposits..."
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border/50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 sm:p-8">
          {loading ? (
            <CardsSkeleton count={3} />
          ) : filteredDeposits.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Lock}
                title="No Term Deposits Found"
                description={search ? "No deposits match your search criteria." : "You do not have any active or past term deposits."}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filteredDeposits.map((deposit) => {
                const isActive = deposit.status === 'active';
                const isMatured = deposit.status === 'matured';
                const isBroken = deposit.status === 'broken';

                return (
                  <div 
                    key={deposit._id}
                    className="group relative bg-background border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Status Ribbon */}
                    <div className={cn(
                      "absolute top-0 right-0 px-4 py-1.5 rounded-bl-xl text-[10px] font-black uppercase tracking-widest text-white z-10",
                      isActive && "bg-amber-500 shadow-amber-500/20",
                      isMatured && "bg-emerald-500 shadow-emerald-500/20",
                      isBroken && "bg-rose-500 shadow-rose-500/20"
                    )}>
                      {deposit.status}
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                      <div className={cn(
                        "p-4 rounded-2xl border flex-shrink-0 transition-transform group-hover:scale-105",
                        isActive ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                        isMatured ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                        "bg-rose-500/10 border-rose-500/20 text-rose-500"
                      )}>
                        {isActive ? <Lock size={24} /> : 
                         isMatured ? <CheckCircle2 size={24} /> : 
                         <XCircle size={24} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg tracking-tight">
                          {deposit.depositNumber || 'TD-XXXX'}
                        </h3>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {deposit.duration} Months Term @ {deposit.profitRate}%
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted/50 rounded-2xl">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                          Principal Amount
                        </p>
                        <p className="font-black text-lg">
                          {formatCurrency(deposit.principal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                          {isMatured || isBroken ? 'Actual Profit' : 'Projected Profit'}
                        </p>
                        <p className={cn(
                          "font-black text-lg",
                          isActive ? "text-indigo-500" :
                          isMatured ? "text-emerald-500" : "text-rose-500"
                        )}>
                          +{formatCurrency(isActive ? deposit.projectedProfit : deposit.actualProfit)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={14} />
                        <span>Started: {new Date(deposit.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays size={14} />
                        <span className={cn(
                          isActive && "text-foreground font-bold"
                        )}>
                          Maturity: {new Date(deposit.maturityDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {isBroken && deposit.brokenAt && (
                      <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-rose-500 bg-rose-500/10 p-2.5 rounded-lg">
                        <AlertCircle size={14} />
                        Broken early on {new Date(deposit.brokenAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberTermDeposits;
