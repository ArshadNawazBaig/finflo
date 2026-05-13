import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp,
  Percent,
  History,
  ArrowUpRight,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { TablePageSkeleton } from '@/components/ui/PageSkeletons';
import StatsCard from '@/components/StatsCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import InfiniteLoader from '@/components/InfiniteLoader';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import DistributeProfitModal from '@/components/DistributeProfitModal';
import TableSearch from '@/components/ui/TableSearch';
import DistributionTable from '@/components/distributions/DistributionTable';
import DistributionCard from '@/components/distributions/DistributionCard';
import { useIsMobile } from '@/hooks/useIsMobile';

const DistributionCardSkeleton = () => (
  <div className="p-5 rounded-[1.5rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted/30" />
        <div className="space-y-2">
          <div className="h-4 w-24 bg-muted/30 rounded" />
          <div className="h-3 w-16 bg-muted/20 rounded" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="h-5 w-12 bg-muted/20 rounded-full" />
        <div className="h-3 w-10 bg-muted/10 rounded" />
      </div>
    </div>
    <div className="flex justify-between items-end">
      <div className="space-y-2">
        <div className="h-6 w-20 bg-muted/30 rounded" />
        <div className="h-3 w-28 bg-muted/20 rounded" />
      </div>
      <div className="h-3 w-16 bg-muted/10 rounded italic" />
    </div>
  </div>
);

const DistributionHub = () => {
  const [data, setData] = useState({
    distributions: [],
    summary: {
      totalRegular: 0,
      totalShare: 0,
      count: 0,
    },
    pagination: {
      page: 1,
      pages: 1,
      total: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [distType, setDistType] = useState('regular');
  const isMobile = useIsMobile();
  const [limit, setLimit] = useState(DESKTOP_PAGE_LIMIT);

  const observerTarget = useRef(null);

  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
  }, [isMobile]);

  const fetchDistributions = useCallback(async (pageNum = 1, isAppend = false) => {
    try {
      if (isAppend) {
        setIsFetchingMore(true);
      } else {
        setLoading(true);
      }

      const { data: res } = await api.get(
        `/members/distributions?page=${pageNum}&limit=${limit}&search=${searchTerm}`,
      );

      setData((prev) => ({
        ...res,
        distributions: isAppend
          ? [...prev.distributions, ...res.distributions]
          : res.distributions,
      }));
    } catch (error) {
      console.error('Failed to fetch distributions:', error);
      toast.error('Failed to load distribution history');
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  }, [limit, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDistributions(1, false);
    }, searchTerm ? 500 : 0);
    return () => clearTimeout(timer);
  }, [fetchDistributions, searchTerm]);

  // Infinite Scroll Observer for Mobile
  useEffect(() => {
    if (!isMobile || loading || isFetchingMore) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && data.pagination.page < data.pagination.pages) {
          fetchDistributions(data.pagination.page + 1, true);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isMobile, loading, isFetchingMore, data.pagination.page, data.pagination.pages, fetchDistributions]);

  const handleOpenModal = (type) => {
    setDistType(type);
    setModalOpen(true);
  };

  if (loading && data.distributions.length === 0) {
    return <TablePageSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={
          <>
            Distribution <span className="text-primary">Center</span>
          </>
        }
        description="Manage and track profit distributions for regular investments and business shares."
      >
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          <div className="bg-teal-500/10 border border-teal-500/20 text-teal-600 px-4 py-2 rounded-full text-[11px] font-bold leading-none flex items-center gap-2">
            <Percent size={12} /> Saving profit is accrued automatically daily
          </div>
          <Button
            onClick={() => handleOpenModal('share')}
            className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex-1 sm:flex-none"
          >
            <TrendingUp size={14} strokeWidth={2.5} />
            Share Profit
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Saving Distributed"
          amount={formatCurrency(data.summary?.totalSaving || 0)}
          icon={<Percent size={20} />}
          color="bg-teal-500 shadow-teal-500/20"
        />
        <StatsCard
          title="Total Share Distributed"
          amount={formatCurrency(data.summary?.totalShare || 0)}
          icon={<ArrowUpRight size={20} />}
          color="bg-indigo-500 shadow-indigo-500/20"
        />
        <StatsCard
          title="Distribution Cycles"
          amount={data.summary?.count || 0}
          icon={<History size={20} />}
          color="bg-orange-500 shadow-orange-500/20"
        />
      </div>

      {/* Distribution History Search & Title */}
      <Card className="border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none rounded-[2rem] overflow-hidden">
        <CardHeader className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                History
              </p>
              <CardTitle className="text-xl font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                Distribution History
              </CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                A complete log of all earnings shared with members
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TableSearch
                value={searchTerm}
                onChange={(val) => setSearchTerm(val)}
                placeholder="Search by member name..."
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Standalone Distribution History List */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
        {isMobile ? (
          <div className="space-y-4">
            {data.distributions.map((dist) => (
              <DistributionCard key={dist._id} dist={dist} />
            ))}
            
            {!loading && data.distributions.length === 0 && (
              <div className="py-12 text-center opacity-30">
                <History size={48} className="mx-auto mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">
                  No distribution records found
                </p>
              </div>
            )}

            {data.pagination.page < data.pagination.pages && (
              <div ref={observerTarget}>
                <InfiniteLoader isFetchingMore={isFetchingMore} />
              </div>
            )}
          </div>
        ) : (
          <DistributionTable
            data={data.distributions}
            loading={loading}
            pagination={{
              currentPage: data.pagination.page,
              totalPages: data.pagination.pages,
              totalEntries: data.pagination.total,
              limit: limit,
              onPageChange: (page) => fetchDistributions(page, false),
              onLimitChange: (newLimit) => setLimit(newLimit),
            }}
          />
        )}
      </div>

      <DistributeProfitModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchDistributions(1, false)}
        type={distType}
      />
    </div>
  );
};

export default DistributionHub;
