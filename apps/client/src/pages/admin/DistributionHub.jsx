import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp,
  Percent,
  History,
  ArrowUpRight,
  TrendingDown,
  Calendar,
  Users,
  Search,
  Filter,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';
import DistributeProfitModal from '@/components/DistributeProfitModal';
import { Skeleton } from '@/components/ui/skeleton';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import TableSearch from '@/components/ui/TableSearch';
import InfiniteLoader from '@/components/InfiniteLoader';

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
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [distType, setDistType] = useState('regular'); // 'regular' or 'share'

  const observer = useRef();
  const lastElementRef = useCallback(
    (node) => {
      if (loading || isFetchingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (
          entries[0].isIntersecting &&
          data.pagination.page < data.pagination.pages
        ) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, isFetchingMore, data.pagination.page, data.pagination.pages],
  );

  const fetchDistributions = async (pageNum, isNewSearch = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setIsFetchingMore(true);

      const { data: res } = await api.get(
        `/members/distributions?page=${pageNum}&limit=${limit}&search=${searchTerm}`,
      );

      setData((prev) => ({
        ...res,
        distributions: isNewSearch
          ? res.distributions
          : [...prev.distributions, ...res.distributions],
      }));
    } catch (error) {
      console.error('Failed to fetch distributions:', error);
      toast.error('Failed to load distribution history');
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(
      () => {
        setPage(1);
        fetchDistributions(1, true);
      },
      searchTerm ? 500 : 0,
    );
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  useEffect(() => {
    if (page > 1) {
      fetchDistributions(page);
    }
  }, [page]);

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
            amount={formatCurrency(data.summary.totalRegular)}
            icon={<TrendingUp size={20} />}
            color="bg-primary shadow-primary/20"
          />
          <StatsCard
            title="Total Share Distributed"
            amount={formatCurrency(data.summary.totalShare)}
            icon={<ArrowUpRight size={20} />}
            color="bg-indigo-500 shadow-indigo-500/20"
          />
          <StatsCard
            title="Distribution Cycles"
            amount={data.summary.count}
            icon={<History size={20} />}
            color="bg-orange-500 shadow-orange-500/20"
          />
        </div>
      )}

      {/* Distribution History Header */}
      <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-8 pb-4 border-b border-border/40">
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
                onChange={(val) => {
                  setSearchTerm(val);
                }}
                placeholder="Search by member name..."
              />
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl border-border/50 h-10 w-10 flex shrink-0"
              >
                <Filter size={16} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop View: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Member / Period
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Type
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Method
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Date
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {loading && data.distributions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <TableSkeleton rows={5} columns={5} />
                    </td>
                  </tr>
                ) : data.distributions.length > 0 ? (
                  data.distributions.map((dist, index) => (
                    <tr
                      key={dist._id}
                      ref={
                        index === data.distributions.length - 1
                          ? lastElementRef
                          : null
                      }
                      className="group hover:bg-muted/20 transition-all duration-300"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${dist.type === 'share' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-primary/10 text-primary'}`}
                          >
                            {dist.member?.name?.[0]?.toUpperCase() || 'M'}
                          </div>
                          <div>
                            <div className="text-sm font-black capitalize tracking-tight group-hover:text-primary transition-colors">
                              {dist.member?.name || 'Unknown Member'}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                              <Calendar size={10} />
                              {dist.period}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-sm font-black text-foreground">
                          {formatCurrency(dist.amount)}
                        </div>
                        {dist.profitRate && (
                          <div className="text-[10px] text-muted-foreground font-medium">
                            {dist.profitRate}% Rate
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${dist.type === 'share' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-emerald-500/10 text-emerald-500'}`}
                        >
                          {dist.type === 'share' ? 'Business Share' : 'Regular'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                          <Users size={14} />
                          {dist.method === 'custom' ? 'Custom' : 'Proportional'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-xs font-bold text-muted-foreground">
                          {formatDate(dist.date)}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div
                          className={cn(
                            'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md inline-flex items-center gap-1.5 border leading-none',
                            dist.status === 'Completed' &&
                              'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
                            dist.status === 'Pending' &&
                              'bg-amber-500/10 text-amber-600 border-amber-500/20',
                            dist.status === 'Failed' &&
                              'bg-rose-500/10 text-rose-600 border-rose-500/20',
                          )}
                        >
                          <span
                            className={cn(
                              'w-1 h-1 rounded-full',
                              dist.status === 'Completed' && 'bg-emerald-500',
                              dist.status === 'Pending' &&
                                'bg-amber-500 animate-pulse',
                              dist.status === 'Failed' && 'bg-rose-500',
                            )}
                          />
                          {dist.status || 'Completed'}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center">
                      <div className="flex flex-col items-center justify-center opacity-30">
                        <History size={48} className="mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest">
                          No distribution records found
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Cards */}
          <div className="md:hidden p-4 space-y-4">
            {loading && data.distributions.length === 0 ? (
              <CardsSkeleton count={5} />
            ) : data.distributions.length > 0 ? (
              data.distributions.map((dist, index) => (
                <div
                  key={dist._id}
                  ref={
                    index === data.distributions.length - 1
                      ? lastElementRef
                      : null
                  }
                  className="p-5 rounded-[2rem] border border-border/50 bg-background/40 hover:bg-muted/10 transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${dist.type === 'share' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-primary/10 text-primary'}`}
                      >
                        {dist.member?.name?.[0]?.toUpperCase() || 'M'}
                      </div>
                      <div>
                        <div className="text-sm font-black capitalize tracking-tight group-hover:text-primary transition-colors">
                          {dist.member?.name || 'Unknown Member'}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                          <Calendar size={10} />
                          {dist.period}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${dist.type === 'share' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-emerald-500/10 text-emerald-500'}`}
                      >
                        {dist.type === 'share' ? 'Share' : 'Regular'}
                      </span>
                      <div
                        className={cn(
                          'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md flex items-center gap-1 border leading-none',
                          dist.status === 'Completed' &&
                            'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
                          dist.status === 'Pending' &&
                            'bg-amber-500/10 text-amber-600 border-amber-500/20',
                          dist.status === 'Failed' &&
                            'bg-rose-500/10 text-rose-600 border-rose-500/20',
                        )}
                      >
                        {dist.status || 'Completed'}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-lg font-black text-foreground">
                        {formatCurrency(dist.amount)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <Users size={10} />
                          {dist.method === 'custom' ? 'Custom' : 'Proportional'}
                        </span>
                        {dist.profitRate && (
                          <span className="text-[10px] text-primary font-black uppercase tracking-widest">
                            • {dist.profitRate}% Rate
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest italic">
                      {formatDate(dist.date)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center opacity-30">
                <History size={48} className="mx-auto mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">
                  No distribution records found
                </p>
              </div>
            )}
          </div>

          {/* Infinite Scroll Loader */}
          <div className="py-4">
            <InfiniteLoader isFetchingMore={isFetchingMore} />
          </div>
        </CardContent>
      </Card>

      <DistributeProfitModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setPage(1);
          fetchDistributions(1, true);
        }}
        type={distType}
      />
    </div>
  );
};

export default DistributionHub;
