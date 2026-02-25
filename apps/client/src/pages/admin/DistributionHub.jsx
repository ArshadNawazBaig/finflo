import { useState, useEffect } from 'react';
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
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import DistributeProfitModal from '@/components/DistributeProfitModal';
import { Skeleton } from '@/components/ui/skeleton';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import TableSearch from '@/components/ui/TableSearch';
import Pagination from '@/components/ui/Pagination';

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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [distType, setDistType] = useState('regular'); // 'regular' or 'share'

  const fetchDistributions = async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get(
        `/members/distributions?page=${page}&limit=${limit}&search=${searchTerm}`,
      );
      setData(res);
    } catch (error) {
      console.error('Failed to fetch distributions:', error);
      toast.error('Failed to load distribution history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(
      () => {
        fetchDistributions();
      },
      searchTerm ? 500 : 0,
    );
    return () => clearTimeout(delayDebounceFn);
  }, [page, limit, searchTerm]);

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
      <div className="grid gap-4 sm:gap-6">
        {loading && !data.distributions.length ? (
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
      </div>

      {/* Distribution History Table */}
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
                  setPage(1);
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
          <div className="overflow-x-auto">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {loading && !data.distributions.length ? (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <TableSkeleton />
                    </td>
                  </tr>
                ) : data.distributions.length > 0 ? (
                  data.distributions.map((dist) => (
                    <tr
                      key={dist._id}
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
        </CardContent>
        {data.pagination.pages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={data.pagination.pages}
            totalEntries={data.pagination.total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        )}
      </Card>

      <DistributeProfitModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchDistributions}
        type={distType}
      />
    </div>
  );
};

export default DistributionHub;
