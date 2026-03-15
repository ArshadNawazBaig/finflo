import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp,
  Percent,
  History,
  ArrowUpRight,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import DistributeProfitModal from '@/components/DistributeProfitModal';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import TableSearch from '@/components/ui/TableSearch';
import InfiniteLoader from '@/components/InfiniteLoader';
import DistributionTable from '@/components/distributions/DistributionTable';
import DistributionCard from '@/components/distributions/DistributionCard';
import DistributionCardSkeleton from '@/components/skeletons/DistributionCardSkeleton';

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [limit, setLimit] = useState(window.innerWidth < 768 ? 5 : 10);

  const observerTarget = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setLimit(isMobile ? 5 : 10);
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
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            onClick={() => handleOpenModal('regular')}
            variant="gradient"
            className="px-6 py-2.5 rounded-full flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest flex-1 sm:flex-none"
          >
            <Percent size={16} />
            Regular Profit
          </Button>
          <Button
            onClick={() => handleOpenModal('share')}
            variant="outline"
            className="px-6 py-2.5 rounded-full flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 flex-1 sm:flex-none"
          >
            <TrendingUp size={16} />
            Share Profit
          </Button>
        </div>
      </PageHeader>

      {/* Summary Stats */}
      {loading && data.distributions.length === 0 ? (
        <CardsSkeleton count={3} />
      ) : (
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Total Regular Distributed"
            amount={formatCurrency(data.summary?.totalRegular || 0)}
            icon={<TrendingUp size={20} />}
            color="bg-primary shadow-primary/20"
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
      )}

      {/* Distribution History Search & Title */}
      <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black tracking-tight">
                Distribution History
              </CardTitle>
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-widest mt-1">
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
        {loading && !isFetchingMore ? (
          <div className="py-6">
            {isMobile ? (
              <div className="space-y-4">
                {[...Array(limit)].map((_, i) => (
                  <DistributionCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <TableSkeleton rows={limit} columns={6} />
            )}
          </div>
        ) : isMobile ? (
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

            {/* Infinite Scroll Trigger */}
            <div ref={observerTarget} className="h-4 w-full" />
            
            {isFetchingMore && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <DistributionCardSkeleton key={i} />
                ))}
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
