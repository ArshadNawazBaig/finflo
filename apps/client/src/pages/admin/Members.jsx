import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Users,
  DollarSign,
  TrendingUp,
  Wallet,
  Loader2,
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import PageHeader from '@/components/PageHeader';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import TableSearch from '@/components/ui/TableSearch';
import AddMemberModal from '@/components/AddMemberModal';
import MemberTable from '@/components/member/MemberTable';
import MemberCard from '@/components/member/MemberCard';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatPKR } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import InfiniteLoader from '@/components/InfiniteLoader';
import EmptyState from '@/components/ui/EmptyState';

const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteMemberId, setDeleteMemberId] = useState(null);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [summary, setSummary] = useState({
    totalInvested: 0,
    totalProfit: 0,
    activeMembers: 0,
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const observerTarget = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setLimit(3);
    } else {
      setLimit(10);
    }
    setCurrentPage(1);
  }, [isMobile]);

  const fetchMembers = useCallback(
    async (isAppend = false, pageOverride) => {
      try {
        if (isAppend) {
          setIsFetchingMore(true);
        } else {
          setLoading(true);
        }

        const pageToFetch =
          pageOverride || (isAppend ? currentPage + 1 : currentPage);
        const { data } = await api.get(
          `/members?page=${pageToFetch}&limit=${limit}&search=${searchTerm}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        );

        if (isAppend) {
          setMembers((prev) => {
            const existingIds = new Set(prev.map((m) => m._id));
            const newMembers = (data.data || []).filter(
              (m) => !existingIds.has(m._id),
            );
            return [...prev, ...newMembers];
          });
        } else {
          setMembers(data.data || []);
        }

        if (data.summary) {
          setSummary(data.summary);
        }

        setTotalEntries(data.totalEntries || 0);
        setTotalPages(data.totalPages || 0);
        setCurrentPage(pageToFetch);
      } catch (error) {
        console.error('Failed to fetch members', error);
        toast.error('Failed to load members');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [limit, searchTerm, sortBy, sortOrder, currentPage],
  );

  useEffect(() => {
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          currentPage < totalPages
        ) {
          fetchMembers(true);
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isMobile, isFetchingMore, currentPage, totalPages, fetchMembers]);

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
      fetchMembers(false, 1);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, sortBy, sortOrder, limit, isMobile]);

  const handleAddMember = () => {
    setIsAddModalOpen(true);
  };

  const handleMemberAdded = () => {
    fetchMembers(false);
    setIsAddModalOpen(false);
    toast.success('Member added successfully');
  };

  const handleDeleteMember = async () => {
    if (!deleteMemberId) return;
    try {
      await api.delete(`/members/${deleteMemberId}`);
      toast.success('Member deleted successfully');
      setDeleteMemberId(null);
      fetchMembers(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete member');
    }
  };

  // Use backend summary for stats
  const statsDisplay = {
    totalMembers: totalEntries,
    totalInvested: summary.totalInvested,
    totalProfit: summary.totalProfit,
    activeMembers: summary.activeMembers,
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Members"
        description="Manage investors and track their investments and profits."
        action={
          <Button
            onClick={handleAddMember}
            variant="gradient"
            className="px-6 py-2.5 rounded-full flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wider w-full sm:w-auto"
          >
            <Plus size={16} />
            Add Member
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Members"
          amount={statsDisplay.totalMembers}
          icon={<Users size={20} />}
          color="bg-primary shadow-primary/20"
        />
        <StatsCard
          title="Active Members"
          amount={statsDisplay.activeMembers}
          icon={<TrendingUp size={20} />}
          color="bg-emerald-500 shadow-emerald-500/20"
        />
        <StatsCard
          title="Total Invested"
          amount={formatPKR(statsDisplay.totalInvested)}
          icon={<Wallet size={20} />}
          color="bg-blue-500 shadow-blue-500/20"
        />
        <StatsCard
          title="Total Profit Distributed"
          amount={formatPKR(statsDisplay.totalProfit)}
          icon={<DollarSign size={20} />}
          color="bg-purple-500 shadow-purple-500/20"
        />
      </div>

      {/* Search and Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <TableSearch
            value={searchTerm}
            onChange={(value) => setSearchTerm(value)}
            placeholder="Search members..."
          />
        </div>

        {loading && !isFetchingMore ? (
          <div className="py-20 flex justify-center items-center">
            {isMobile ? (
              <InfiniteLoader isFetchingMore={true} />
            ) : (
              <TableSkeleton />
            )}
          </div>
        ) : isMobile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {members.map((member) => (
                <MemberCard key={member._id} member={member} />
              ))}
            </div>

            {/* Infinite Scroll Trigger */}
            {currentPage < totalPages && (
              <div ref={observerTarget}>
                <InfiniteLoader isFetchingMore={isFetchingMore} />
              </div>
            )}

            {members.length === 0 && (
              <EmptyState
                icon={Users}
                title="No Members Found"
                description={
                  searchTerm
                    ? "We couldn't find any members matching your search."
                    : 'No members have been added yet. Start by inviting or adding a new member.'
                }
                className="border-none bg-card/50"
              />
            )}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <MemberTable
              data={members}
              onDelete={setDeleteMemberId}
              pagination={{
                currentPage,
                totalPages,
                totalEntries,
                limit,
                onPageChange: (page) => fetchMembers(false, page),
                onLimitChange: (newLimit) => {
                  setLimit(newLimit);
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

      <AlertDialog
        open={!!deleteMemberId}
        onOpenChange={() => setDeleteMemberId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this member? This action cannot be
              undone and all associated data will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              className="bg-gradient-to-r from-red-500 to-destructive text-white shadow-xl shadow-red-500/20 hover:brightness-110"
            >
              Delete Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Members;
