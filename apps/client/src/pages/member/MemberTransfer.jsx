import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  History,
  Wallet,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, cn } from '@/lib/utils';
import InternalTransferForm from '@/components/member/InternalTransferForm';
import BankWithdrawalForm from '@/components/member/BankWithdrawalForm';
import {
  MemberTransferSkeleton,
  RecentActivityListSkeleton,
} from '@/components/ui/PageSkeletons';

const MemberTransfer = () => {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('internal'); // 'internal' | 'external'

  // History State
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch Member
  const fetchMember = useCallback(async () => {
    try {
      const { data } = await api.get('/member-auth/me');
      setMember(data);
    } catch (error) {
      toast.error('Failed to load wallet balance.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  // Fetch History based on tab
  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      if (activeTab === 'internal') {
        const { data } = await api.get('/members/portal/activity?limit=5');
        const p2pOnly = (data.data || []).filter(
          (tx) => tx.type === 'transfer_send' || tx.type === 'transfer_receive',
        );
        setHistory(p2pOnly);
      } else {
        const { data } = await api.get('/external-transfers?limit=5');
        setHistory(data.data || []);
      }
    } catch (error) {
      // Silent fail
    } finally {
      setHistoryLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSuccess = () => {
    fetchMember();
    fetchHistory();
  };

  if (loading) return <MemberTransferSkeleton />;

  return (
    <div className="space-y-10 pb-20 w-full animate-in fade-in duration-300">
      <PageHeader
        title="Transfer & Withdraw"
        description="Send funds to friends or withdraw exactly to your Raast/Bank account."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Transfer Controls */}
        <div className="lg:col-span-8 space-y-6">
          {/* Tabs */}
          <div className="flex p-1.5 bg-muted/30 rounded-2xl border border-border/40 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('internal')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                activeTab === 'internal'
                  ? 'bg-background shadow-sm text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <User size={16} /> Finflo Member
            </button>
            <button
              onClick={() => setActiveTab('external')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                activeTab === 'external'
                  ? 'bg-background shadow-sm text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Building2 size={16} /> Withdraw To Bank
            </button>
          </div>

          <div className="bg-card p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm relative overflow-hidden w-full flex flex-col min-h-[500px]">
            {/* Background design */}
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
              {activeTab === 'internal' ? (
                <User size={200} />
              ) : (
                <Building2 size={200} />
              )}
            </div>

            {activeTab === 'internal' ? (
              <InternalTransferForm member={member} onSuccess={handleSuccess} />
            ) : (
              <BankWithdrawalForm member={member} onSuccess={handleSuccess} />
            )}
          </div>
        </div>

        {/* Right Column - Balance & Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary/5 border border-primary/20 rounded-[2.5rem] p-8 space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Wallet size={120} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              Available Balance
            </p>
            <h2 className="text-xl font-black tracking-tighter text-foreground">
              {formatCurrency(member?.currentBalance || 0)}
            </h2>
            <div className="h-px bg-border/50 w-full my-4!" />
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                <span>Daily Limit</span>
                <span>Rs. 500k</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                <span>Monthly Limit</span>
                <span>Unlimited</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-[2.5rem] p-6 space-y-4">
            <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
              <History size={16} className="text-muted-foreground" /> Recent{' '}
              {activeTab === 'internal' ? 'Transfers' : 'Withdrawals'}
            </h3>

            <div className="space-y-3">
              {historyLoading ? (
                <RecentActivityListSkeleton count={3} />
              ) : history.length === 0 ? (
                <div className="p-6 text-center text-xs font-bold text-muted-foreground/50">
                  No recent activity found.
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item._id}
                    className="p-4 rounded-xl bg-muted/20 border border-border/30 flex flex-col"
                  >
                    {/* Top Row: Title (Left) & Status (Right) */}
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-xs font-black tracking-tight capitalize leading-tight">
                        {item.description || item.bankName}
                      </p>
                      {item.status && (
                        <div
                          className={cn(
                            'shrink-0 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md flex items-center gap-1 border leading-none transition-all',
                            item.status === 'Completed' &&
                              'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
                            item.status === 'Pending' &&
                              'bg-amber-500/10 text-amber-600 border-amber-500/20',
                            item.status === 'Failed' &&
                              'bg-rose-500/10 text-rose-600 border-rose-500/20',
                          )}
                        >
                          <span
                            className={cn(
                              'w-1 h-1 rounded-full',
                              item.status === 'Completed' && 'bg-emerald-500',
                              item.status === 'Pending' &&
                                'bg-amber-500 animate-pulse',
                              item.status === 'Failed' && 'bg-rose-500',
                            )}
                          />
                          {item.status}
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Date/Sender (Left) & Amount (Right) */}
                    <div className="flex items-end justify-between mt-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase">
                          {new Date(
                            item.date || item.createdAt,
                          ).toLocaleDateString()}
                        </p>

                        {/* Sender/Recipient Details */}
                        {(item.type === 'transfer_receive' ||
                          item.type === 'transfer_send') && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <div className="text-[9px] font-bold text-muted-foreground flex items-center gap-1">
                              {item.type === 'transfer_receive' ? (
                                <>
                                  <ArrowDownLeft
                                    size={10}
                                    className="text-emerald-500"
                                  />
                                  From:{' '}
                                  <span className="text-foreground capitalize">
                                    {item.metadata?.senderName ||
                                      item.description?.replace(
                                        /transfer from /i,
                                        '',
                                      )}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <ArrowUpRight
                                    size={10}
                                    className="text-rose-500"
                                  />
                                  To:{' '}
                                  <span className="text-foreground capitalize">
                                    {item.metadata?.recipientName ||
                                      item.description?.replace(
                                        /transfer to /i,
                                        '',
                                      )}
                                  </span>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      <span className="text-sm font-black text-rose-500 shrink-0 ml-2">
                        -{formatCurrency(item.amount)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberTransfer;
