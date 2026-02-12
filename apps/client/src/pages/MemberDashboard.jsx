import { useState, useEffect, useCallback, useRef } from 'react';
import { Wallet, TrendingUp, DollarSign, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatsCard from '@/components/StatsCard';
import PageHeader from '@/components/PageHeader';
import CardsSkeleton from '@/components/CardsSkeleton';
import MemberLoanRequestModal from '@/components/MemberLoanRequestModal';
import InfiniteLoader from '@/components/InfiniteLoader';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatPKR } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';

const MemberDashboard = () => {
  const [member, setMember] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Pagination & Mobile State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const observerTarget = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchDashboardData = useCallback(
    async (isAppend = false) => {
      try {
        if (!isAppend) {
          setLoading(true);
          setCurrentPage(1);
        } else {
          setIsFetchingMore(true);
        }

        const memberToken = localStorage.getItem('memberToken');
        const pageToFetch = isAppend ? currentPage + 1 : 1;

        // Fetch member details (only on first load)
        if (!isAppend) {
          const { data: memberData } = await api.get('/member-auth/me', {
            headers: { Authorization: `Bearer ${memberToken}` },
          });
          setMember(memberData);
        }

        // Fetch member loans
        const { data: response } = await api.get(
          `/loans/my-loans?page=${pageToFetch}&limit=10`,
          {
            headers: { Authorization: `Bearer ${memberToken}` },
          },
        );

        const newLoans = response.data || [];

        if (isAppend) {
          setLoans((prev) => {
            const existingIds = new Set(prev.map((l) => l._id));
            const filtered = newLoans.filter((l) => !existingIds.has(l._id));
            return [...prev, ...filtered];
          });
          setCurrentPage(pageToFetch);
        } else {
          setLoans(newLoans);
        }

        setTotalPages(response.totalPages || 0);
        setTotalEntries(response.totalEntries || 0);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [currentPage],
  );

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!isMobile || !observerTarget.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          currentPage < totalPages
        ) {
          fetchDashboardData(true);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isMobile, isFetchingMore, currentPage, totalPages, fetchDashboardData]);

  const activeLoansCount = loans.filter((l) => l.status === 'active').length;
  const pendingRequestsCount = loans.filter(
    (l) => l.status === 'pending',
  ).length;
  const rejectedRequestsCount = loans.filter(
    (l) => l.status === 'rejected',
  ).length;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Top Header */}
      <PageHeader
        title={
          <>
            Member <span className="text-primary italic">Dashboard</span>
          </>
        }
        description="Welcome back. Track your investments and loan requests."
      />

      {/* Stats Grid */}
      {loading && loans.length === 0 ? (
        <CardsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          <StatsCard
            title="Total Invested"
            amount={formatPKR(member?.totalInvested || 0)}
            icon={<Wallet size={20} />}
            color="bg-primary shadow-primary/20"
          />
          <StatsCard
            title="Approved Loans"
            amount={activeLoansCount}
            icon={<TrendingUp size={20} />}
            color="bg-emerald-500 shadow-emerald-500/20"
          />
          <StatsCard
            title="Pending Requests"
            amount={pendingRequestsCount}
            icon={<FileText size={20} />}
            color="bg-amber-500 shadow-amber-500/20"
          />
          <StatsCard
            title="Rejected Requests"
            amount={rejectedRequestsCount}
            icon={<DollarSign size={20} />}
            color="bg-red-500 shadow-red-500/20"
          />
        </div>
      )}

      {/* Loans Section */}
      <div className="bg-card p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-xl font-black tracking-tighter">
              My Loan Requests
            </h3>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              View and manage all your loan applications
            </p>
          </div>
          <Button
            variant="gradient"
            className="rounded-full gap-2 text-xs font-black uppercase tracking-widest px-6 py-3"
            onClick={() => setIsRequestModalOpen(true)}
          >
            <Plus size={16} strokeWidth={3} />
            Request Loan
          </Button>
        </div>

        {loans.length === 0 && !loading ? (
          <EmptyState
            icon={FileText}
            title="No Loans Yet"
            description="You haven't requested any loans yet. Start your first application to get started."
            className="border-none bg-card/50"
          />
        ) : (
          <div className="space-y-3">
            {loans.map((loan) => (
              <div
                key={loan._id}
                className="p-6 rounded-[2rem] border border-border/50 hover:bg-muted/30 transition-all group"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-lg">
                        {formatPKR(loan.principal)} Loan
                      </h4>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          loan.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : loan.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-600'
                              : loan.status === 'completed'
                                ? 'bg-blue-500/10 text-blue-600'
                                : 'bg-muted/50 dark:bg-white/5 text-muted-foreground dark:text-muted-foreground/80'
                        }`}
                      >
                        {loan.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {loan.duration} months @ {loan.rate}% interest
                    </p>
                    {loan.status === 'active' && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span className="text-muted-foreground">
                            Remaining
                          </span>
                          <span>
                            {formatPKR(
                              loan.remainingAmount || loan.totalAmount,
                            )}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all"
                            style={{
                              width: `${100 - ((loan.remainingAmount || loan.totalAmount) / loan.totalAmount) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Infinite Scroll Trigger */}
            {isMobile && currentPage < totalPages && (
              <div ref={observerTarget}>
                <InfiniteLoader isFetchingMore={isFetchingMore} />
              </div>
            )}
          </div>
        )}
      </div>

      <MemberLoanRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={() => fetchDashboardData(false)}
      />
    </div>
  );
};

export default MemberDashboard;
