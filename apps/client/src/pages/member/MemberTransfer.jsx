import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  History,
  Wallet,
  QrCode,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, cn } from '@/lib/utils';
import { isCreditType } from '@/lib/transactionDirection';
import InternalTransferForm from '@/components/member/InternalTransferForm';
import BankWithdrawalForm from '@/components/member/BankWithdrawalForm';
import QRScanner from '@/components/QRScanner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  const [showQRScanner, setShowQRScanner] = useState(false);

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
    <>
      <div className="space-y-10 pb-20 w-full animate-in fade-in duration-300">
        <PageHeader
          title="Transfer & Withdraw"
          description="Send funds to friends or withdraw exactly to your Raast/Bank account."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Transfer Controls */}
          <div className="lg:col-span-8 space-y-6">
            {/* Tabs — flat pill row */}
            <div className="flex p-1 bg-slate-50/40 dark:bg-white/[0.02] rounded-full border border-slate-100 dark:border-white/[0.06]">
              <button
                onClick={() => setActiveTab('internal')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-[11px] font-extrabold uppercase tracking-[0.15em] transition-all',
                  activeTab === 'internal'
                    ? 'bg-primary text-white shadow-[0_8px_24px_-8px_rgba(99,102,241,0.5)]'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                )}
              >
                <User size={14} strokeWidth={2.5} /> Finflo member
              </button>
              <button
                onClick={() => setActiveTab('external')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-[11px] font-extrabold uppercase tracking-[0.15em] transition-all',
                  activeTab === 'external'
                    ? 'bg-primary text-white shadow-[0_8px_24px_-8px_rgba(99,102,241,0.5)]'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                )}
              >
                <Building2 size={14} strokeWidth={2.5} /> Withdraw to bank
              </button>
            </div>

            <div className="bg-white dark:bg-white/[0.02] p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] w-full flex flex-col min-h-[500px]">
              {activeTab === 'internal' ? (
                <InternalTransferForm
                  member={member}
                  onSuccess={handleSuccess}
                  onScanQR={() => setShowQRScanner(true)}
                />
              ) : (
                <BankWithdrawalForm member={member} onSuccess={handleSuccess} />
              )}
            </div>
          </div>

          {/* Right Column - Balance & Summary */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-[2rem] p-6 sm:p-8 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  Total assets
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary [&_svg]:w-3.5 [&_svg]:h-3.5">
                  <Wallet />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.025em] tabular-nums text-slate-900 dark:text-white leading-none">
                {formatCurrency(
                  (member?.currentBalance || 0) +
                    (member?.savingBalance || 0) +
                    (member?.shareBalance || 0),
                )}
              </h2>
              <div className="h-px bg-slate-100 dark:bg-white/[0.06] w-full my-2" />
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Current account
                  </span>
                  <span className="text-xs font-extrabold tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(member?.currentBalance || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Saving account
                  </span>
                  <span className="text-xs font-extrabold tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(member?.savingBalance || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Share account
                  </span>
                  <span className="text-xs font-extrabold tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(member?.shareBalance || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-[2rem] p-6 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5">
                  <History size={11} strokeWidth={2.5} /> Activity
                </p>
                <h3 className="text-base font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                  Recent{' '}
                  {activeTab === 'internal' ? 'transfers' : 'withdrawals'}
                </h3>
              </div>

              <div className="space-y-3">
                {historyLoading ? (
                  <RecentActivityListSkeleton count={3} />
                ) : history.length === 0 ? (
                  <div className="p-6 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
                    No recent activity
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item._id}
                      className="p-4 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] flex flex-col"
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
                        <span
                          className={cn(
                            'text-sm font-black shrink-0 ml-2',
                            isCreditType(item.type)
                              ? 'text-emerald-500'
                              : 'text-rose-500',
                          )}
                        >
                          {isCreditType(item.type) ? '+' : '-'}
                          {formatCurrency(item.amount)}
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

      {/* QR Scanner Dialog */}
      <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
        <DialogContent className="sm:max-w-[500px] !p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
          <div className="bg-gradient-to-br from-primary/10 via-background to-background p-8">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary  shrink-0">
                  <QrCode className="w-7 h-7" />
                </div>
                <div className="text-left min-w-0 pr-8">
                  <DialogTitle className="text-xl font-black tracking-tight">
                    Scan Member QR Code
                  </DialogTitle>
                  <DialogDescription className="text-xs font-medium mt-1">
                    Point your camera at a member&rsquo;s FinFlo QR code to
                    auto-fill their details.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <QRScanner
              onScanSuccess={(decodedText) => {
                try {
                  const payload = JSON.parse(decodedText);
                  if (payload.type === 'finflo_pay' && payload.id) {
                    setShowQRScanner(false);
                    setActiveTab('internal');
                    toast.success(
                      `Recipient found: ${payload.name || 'Member'}`,
                    );
                    window.dispatchEvent(
                      new CustomEvent('finflo:qr-scan', {
                        detail: {
                          recipientId: payload.id,
                          recipientName: payload.name,
                        },
                      }),
                    );
                  } else {
                    toast.error(
                      'Invalid QR code \u2014 not a FinFlo payment QR',
                    );
                  }
                } catch {
                  toast.error('Invalid QR code format');
                }
              }}
              onScanError={() => {}}
            />

            <p className="mt-6 text-[9px] text-center text-muted-foreground/50 font-medium tracking-wide uppercase">
              Only valid FinFlo payment QR codes will be accepted
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MemberTransfer;
