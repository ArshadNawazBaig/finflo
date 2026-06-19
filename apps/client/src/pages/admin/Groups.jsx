import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Users, ShieldCheck, AlertTriangle, Coins } from 'lucide-react';
import TableSearch from '@/components/ui/TableSearch';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import GroupTable from '@/components/groups/GroupTable';
import GroupCard from '@/components/groups/GroupCard';
import AddGroupModal from '@/components/groups/AddGroupModal';
import PageHeader from '@/components/PageHeader';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import InfiniteLoader from '@/components/InfiniteLoader';
import EmptyState from '@/components/ui/EmptyState';
import StatsCard from '@/components/StatsCard';
import { LoansPageSkeleton } from '@/components/ui/PageSkeletons';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import { formatCurrency } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [deleteGroup, setDeleteGroup] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(DESKTOP_PAGE_LIMIT);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const isMobile = useIsMobile();

  const observerTarget = useRef(null);
  const skipNextEffect = useRef(false);

  // Derive headline stats from the group-loan cycles. Total liability is the
  // sum of outstanding balances; group counts come from the groups list.
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/groups/loans?limit=200');
      const cycles = data.data || [];
      const totalLiability = cycles.reduce(
        (sum, c) => sum + (c.totalOutstanding || 0),
        0,
      );
      setStats((prev) => ({ ...(prev || {}), totalLiability }));
    } catch (error) {
      console.error('Failed to fetch group loan stats:', error);
      setStats((prev) => ({ ...(prev || {}), totalLiability: 0 }));
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
    setCurrentPage(1);
  }, [isMobile]);

  const fetchGroups = useCallback(
    async (isAppend = false) => {
      try {
        if (isAppend) {
          setIsFetchingMore(true);
        } else {
          setLoading(true);
        }

        const pageToFetch = isAppend ? currentPage + 1 : currentPage;
        const { data } = await api.get(
          `/groups?page=${pageToFetch}&limit=${limit}&search=${searchTerm}`,
        );

        if (isAppend) {
          setGroups((prev) => {
            const existingIds = new Set(prev.map((g) => g._id));
            const newGroups = (data.data || []).filter(
              (g) => !existingIds.has(g._id),
            );
            return [...prev, ...newGroups];
          });
          skipNextEffect.current = true;
          setCurrentPage(pageToFetch);
        } else {
          setGroups(data.data || []);
        }

        setTotalEntries(data.totalEntries || 0);
        setTotalPages(data.totalPages || 0);
        // Refresh derived counts whenever the full first page loads.
        if (!isAppend) {
          const all = data.data || [];
          setStats((prev) => ({
            ...(prev || {}),
            totalGroups: data.totalEntries || 0,
            activeGroups: all.filter((g) => g.status === 'active').length,
            atRiskGroups: all.filter((g) => g.status === 'at_risk').length,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch groups', error);
        toast.error('Failed to load groups');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [currentPage, limit, searchTerm],
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
          fetchGroups(true);
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isMobile, isFetchingMore, currentPage, totalPages, fetchGroups]);

  useEffect(() => {
    if (skipNextEffect.current) {
      skipNextEffect.current = false;
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetchGroups(false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, limit, currentPage, isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => {
    fetchGroups();
    fetchStats();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteGroup) return;
    try {
      setIsDeleting(true);
      await api.delete(`/groups/${deleteGroup._id}`);
      toast.success('Group deleted successfully');
      refresh();
      setDeleteGroup(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete group');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && groups.length === 0 && !searchTerm) {
    return <LoansPageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Lending Groups"
        description="Manage joint-liability groups and their loan cycles."
      >
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            onClick={() => {
              setEditGroup(null);
              setIsModalOpen(true);
            }}
            className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add Group
          </Button>
        </div>
      </PageHeader>

      {!stats ? (
        <div className="mb-8">
          <CardsSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Groups"
            amount={stats.totalGroups ?? totalEntries}
            subtitle="Lifetime"
            icon={<Users size={20} />}
            color="bg-primary shadow-primary/20"
          />
          <StatsCard
            title="Active Groups"
            amount={stats.activeGroups || 0}
            subtitle="Currently Active"
            icon={<ShieldCheck size={20} />}
            color="bg-emerald-500 shadow-emerald-500/20"
          />
          <StatsCard
            title="At-Risk Groups"
            amount={stats.atRiskGroups || 0}
            subtitle="Joint-Liability Freeze"
            icon={<AlertTriangle size={20} />}
            color="bg-red-500 shadow-red-500/20"
          />
          <StatsCard
            title="Total Liability"
            amount={formatCurrency(stats.totalLiability || 0)}
            subtitle="Outstanding"
            icon={<Coins size={20} />}
            color="bg-orange-500 shadow-orange-500/20"
            sensitive
          />
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <TableSearch
          value={searchTerm}
          onChange={(value) => {
            setSearchTerm(value);
            setCurrentPage(1);
          }}
          placeholder="Search groups..."
        />
      </div>

      <div className="mt-4">
        {loading && !isFetchingMore ? (
          <TableSkeleton rows={limit} columns={6} />
        ) : isMobile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {groups.map((group) => (
                <GroupCard
                  key={group._id}
                  group={group}
                  onEdit={(g) => {
                    setEditGroup(g);
                    setIsModalOpen(true);
                  }}
                  onDelete={setDeleteGroup}
                />
              ))}
            </div>

            {currentPage < totalPages && (
              <div ref={observerTarget}>
                <InfiniteLoader isFetchingMore={isFetchingMore} />
              </div>
            )}

            {groups.length === 0 && (
              <EmptyState
                icon={Users}
                title="No Groups Found"
                description={
                  searchTerm
                    ? "We couldn't find any groups matching your search."
                    : 'No lending groups yet. Start by creating a new joint-liability group.'
                }
                className="border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] rounded-[2rem]"
              />
            )}
          </div>
        ) : (
          <GroupTable
            data={groups}
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
            onEdit={(g) => {
              setEditGroup(g);
              setIsModalOpen(true);
            }}
            onDelete={setDeleteGroup}
          />
        )}
      </div>

      <AddGroupModal
        isOpen={isModalOpen}
        initialData={editGroup}
        onClose={() => {
          setIsModalOpen(false);
          setEditGroup(null);
        }}
        onSuccess={refresh}
      />

      <ConfirmActionModal
        isOpen={!!deleteGroup}
        onClose={() => setDeleteGroup(null)}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
        title="Delete Group"
        description={
          <>
            Are you sure you want to delete{' '}
            <strong>{deleteGroup?.name}</strong>? Groups with active loan cycles
            cannot be deleted. This action cannot be undone.
          </>
        }
        confirmText="Confirm Deletion"
        variant="danger"
      />
    </div>
  );
};

export default Groups;
