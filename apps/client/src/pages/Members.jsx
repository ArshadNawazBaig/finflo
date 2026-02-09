import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Users,
  DollarSign,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import PageHeader from '@/components/PageHeader';
import TableSkeleton from '@/components/TableSkeleton';
import CardsSkeleton from '@/components/CardsSkeleton';
import AddMemberModal from '@/components/AddMemberModal';
import MemberTable from '@/components/MemberTable';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatPKR } from '@/lib/utils';

const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(
        `/members?page=${currentPage}&limit=${limit}&search=${searchTerm}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
      );
      setMembers(data.data || []);
      setTotalEntries(data.totalEntries || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      console.error('Failed to fetch members', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, searchTerm, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchMembers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchMembers]);

  const handleAddMember = () => {
    setIsAddModalOpen(true);
  };

  const handleMemberAdded = () => {
    fetchMembers();
    setIsAddModalOpen(false);
    toast.success('Member added successfully');
  };

  const handleDeleteMember = async (memberId) => {
    try {
      await api.delete(`/members/${memberId}`);
      toast.success('Member deleted successfully');
      fetchMembers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete member');
    }
  };

  // Calculate stats
  const stats = {
    totalMembers: members.length,
    totalInvested: members.reduce((sum, m) => sum + (m.currentBalance || 0), 0),
    totalProfit: members.reduce((sum, m) => sum + (m.totalProfit || 0), 0),
    activeMembers: members.filter((m) => m.status === 'Active').length,
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Members"
        description="Manage investors and track their investments and profits."
        action={
          <button
            onClick={handleAddMember}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-indigo-600 text-white text-[11px] font-black uppercase tracking-wider rounded-full hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 hover:scale-105 w-full sm:w-auto"
          >
            <Plus size={16} />
            Add Member
          </button>
        }
      />

      {/* Stats Cards */}
      {loading ? (
        <CardsSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Members"
            amount={stats.totalMembers}
            icon={<Users size={20} />}
            color="bg-primary shadow-primary/20"
          />
          <StatsCard
            title="Active Members"
            amount={stats.activeMembers}
            icon={<TrendingUp size={20} />}
            color="bg-emerald-500 shadow-emerald-500/20"
          />
          <StatsCard
            title="Total Invested"
            amount={formatPKR(stats.totalInvested)}
            icon={<Wallet size={20} />}
            color="bg-blue-500 shadow-blue-500/20"
          />
          <StatsCard
            title="Total Profit Distributed"
            amount={formatPKR(stats.totalProfit)}
            icon={<DollarSign size={20} />}
            color="bg-purple-500 shadow-purple-500/20"
          />
        </div>
      )}

      {/* Search and Table */}
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-4 h-4 z-10 pointer-events-none" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
          />
        </div>

        {loading ? (
          <TableSkeleton />
        ) : (
          <div className="rounded-[2rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <MemberTable
              data={members}
              onDelete={handleDeleteMember}
              pagination={{
                currentPage,
                totalPages,
                totalEntries,
                limit,
                onPageChange: setCurrentPage,
                onLimitChange: (newLimit) => {
                  setLimit(newLimit);
                  setCurrentPage(1);
                },
              }}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleMemberAdded}
      />
    </div>
  );
};

export default Members;
