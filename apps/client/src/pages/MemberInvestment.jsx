import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  History,
  Info,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/PageHeader';
import CardsSkeleton from '@/components/CardsSkeleton';
import api from '@/lib/axios';
import { formatPKR } from '@/lib/utils';
import { toast } from 'sonner';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';

const MemberInvestment = () => {
  const [investments, setInvestments] = useState([]);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const limit = 10;

  const fetchInvestments = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const memberToken = localStorage.getItem('memberToken');
      const [invRes, memberRes] = await Promise.all([
        api.get(
          `/members/portal/activity?page=${page}&limit=${limit}&category=investment`,
          {
            headers: { Authorization: `Bearer ${memberToken}` },
          },
        ),
        api.get('/member-auth/me', {
          headers: { Authorization: `Bearer ${memberToken}` },
        }),
      ]);

      setInvestments(invRes.data.data || []);
      setMember(memberRes.data);
      setTotalPages(invRes.data.totalPages || 0);
      setTotalEntries(invRes.data.totalEntries || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to fetch investments:', error);
      toast.error('Failed to load investment data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  const stats = [
    {
      label: 'Current Balance',
      value: formatPKR(member?.currentBalance || 0),
      icon: Wallet,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Total Invested',
      value: formatPKR(member?.totalInvested || 0),
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Total Profit',
      value: formatPKR(member?.totalProfit || 0),
      icon: PieChart,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      <PageHeader
        title="Asset Management"
        description="Monitor your investments, track growth, and manage your wealth portfolio."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <CardsSkeleton count={3} />
        ) : (
          stats.map((stat, index) => (
            <div
              key={index}
              className="bg-card p-8 rounded-[2rem] border border-border/50 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`p-4 rounded-2xl ${stat.bgColor} ${stat.color} group-hover:scale-110 transition-transform`}
                >
                  <stat.icon size={24} />
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                  Live Portfolio
                </div>
              </div>
              <h3 className="text-sm font-bold text-muted-foreground mb-1">
                {stat.label}
              </h3>
              <p className="text-3xl font-black tracking-tighter text-foreground">
                {stat.value}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Investment History */}
      <div className="bg-card rounded-[2.5rem] border border-border/50 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-muted rounded-xl">
              <History size={20} className="text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Investment Ledger
            </h2>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
            <Info size={14} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              Profit Rate: {member?.profitRate || 0}%
            </span>
          </div>
        </div>

        <div className="divide-y divide-border/40">
          {loading ? (
            <div className="p-10 text-center">
              <Loader2 className="animate-spin inline mr-2" /> Loading ledger...
            </div>
          ) : investments.length === 0 ? (
            <div className="p-20">
              <EmptyState
                icon={History}
                title="No Investment History"
                description="When you make a deposit or receive profit, it will appear here."
              />
            </div>
          ) : (
            investments.map((item) => (
              <div
                key={item._id}
                className="p-6 sm:p-8 hover:bg-muted/30 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-5">
                  <div
                    className={`p-4 rounded-2xl bg-background border border-border/50 shadow-sm group-hover:scale-110 transition-transform ${item.type === 'deposit' ? 'text-emerald-500' : 'text-red-500'}`}
                  >
                    {item.type === 'deposit' ? (
                      <ArrowUpRight size={18} />
                    ) : (
                      <ArrowDownLeft size={18} />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg tracking-tight capitalize">
                      {item.description}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest">
                        {item.type}
                      </p>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        {new Date(item.date).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`text-xl font-black tracking-tighter ${item.type === 'deposit' ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {item.type === 'deposit' ? '+' : '-'}
                    {formatPKR(item.amount)}
                  </p>
                  {item.metadata?.balanceAfter && (
                    <p className="text-[10px] font-bold text-muted-foreground/60 mt-0.5">
                      Portfolio: {formatPKR(item.metadata.balanceAfter)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {!loading && investments.length > 0 && (
          <div className="p-6 border-t border-border/40">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalEntries={totalEntries}
              limit={limit}
              onPageChange={fetchInvestments}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberInvestment;
