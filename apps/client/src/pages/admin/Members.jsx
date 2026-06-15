import { useState, useEffect, useCallback, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { pendingMembersCountAtom } from '@/atoms';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Users,
  DollarSign,
  TrendingUp,
  Wallet,
  Store,
  Upload,
  Mail,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TablePageSkeleton } from '@/components/ui/PageSkeletons';
import StatsCard from '@/components/StatsCard';
import PageHeader from '@/components/PageHeader';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import TableSearch from '@/components/ui/TableSearch';
import AddMemberModal from '@/components/AddMemberModal';
import BulkImportMembersModal from '@/components/BulkImportMembersModal';
import BulkEmailMembersModal from '@/components/BulkEmailMembersModal';
import MemberTable from '@/components/member/MemberTable';
import MemberCard from '@/components/member/MemberCard';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import InfiniteLoader from '@/components/InfiniteLoader';
import EmptyState from '@/components/ui/EmptyState';
import { useIsMobile } from '@/hooks/useIsMobile';

const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
  const [deleteMemberId, setDeleteMemberId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab =
    searchParams.get('type') === 'pending' ? 'pending' : 'approved';
  const [activeTab, setActiveTab] = useState(initialTab); // 'approved' or 'pending'
  const pendingMembersCount = useAtomValue(pendingMembersCountAtom);
  const setPendingMembersCount = useSetAtom(pendingMembersCountAtom);
  const [summary, setSummary] = useState({
    totalInvested: 0,
    activeMembers: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const isMobile = useIsMobile();
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectMemberId, setRejectMemberId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [branchesLoading, setBranchesLoading] = useState(false);

  const observerTarget = useRef(null);

  // Fetch all-time summary on mount (unaffected by search/sort)
  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const { data } = await api.get('/members?page=1&limit=1');
      if (data.summary) setSummary(data.summary);
    } catch (e) {
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      setBranchesLoading(true);
      const { data } = await api.get('/branches');
      setBranches(data || []);
    } catch (error) {
      console.error('Failed to fetch branches', error);
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
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
        const branchParam =
          selectedBranch && selectedBranch !== 'all'
            ? `&branchId=${selectedBranch}`
            : '';
        const { data } = await api.get(
          `/members?approvalStatus=${activeTab}&page=${pageToFetch}&limit=${limit}&search=${searchTerm}&sortBy=${sortBy}&sortOrder=${sortOrder}${branchParam}`,
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
    [
      limit,
      searchTerm,
      sortBy,
      sortOrder,
      currentPage,
      activeTab,
      selectedBranch,
    ],
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

  useEffect(() => {
    fetchSummary();
    fetchBranches();
  }, [fetchSummary, fetchBranches]);

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
  }, [
    searchTerm,
    sortBy,
    sortOrder,
    limit,
    isMobile,
    activeTab,
    selectedBranch,
  ]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      if (tab === 'pending') {
        prev.set('type', 'pending');
      } else {
        prev.delete('type');
      }
      return prev;
    });
  };

  // Members must belong to a branch, so member creation is blocked until the
  // business has created at least one branch.
  const noBranches = !branchesLoading && branches.length === 0;

  const handleAddMember = () => {
    if (noBranches) {
      toast.error('Create a branch before adding members.');
      return;
    }
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
      setIsDeleting(true);
      await api.delete(`/members/${deleteMemberId}`);
      toast.success('Member deleted successfully');
      setDeleteMemberId(null);
      fetchMembers(false);
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete member');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApproveMember = async (id) => {
    try {
      setApprovingId(id);
      await api.put(`/members/${id}/approval`, { status: 'approved' });
      toast.success('Member approved successfully');
      // Decrement the pending badge immediately (the layout only refreshes it
      // on its own fetch, which the approve/reject action doesn't trigger).
      setPendingMembersCount((c) => Math.max(0, c - 1));
      fetchMembers(false);
      fetchSummary();
      window.dispatchEvent(new CustomEvent('userUpdated'));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve member');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectMember = (id) => {
    setRejectMemberId(id);
    setRejectionReason(''); // Reset reason when opening modal
  };

  const confirmRejectMember = async () => {
    if (!rejectMemberId) return;
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }

    try {
      setRejectingId(rejectMemberId);
      await api.put(`/members/${rejectMemberId}/approval`, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
      });
      toast.success('Member application rejected');
      setPendingMembersCount((c) => Math.max(0, c - 1));
      setRejectMemberId(null);
      setRejectionReason('');
      fetchMembers(false);
      window.dispatchEvent(new CustomEvent('userUpdated'));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject member');
    } finally {
      setRejectingId(null);
    }
  };

  // Use backend summary for stats
  const statsDisplay = {
    totalMembers: totalEntries,
    totalInvested: summary.totalInvested,
    totalProfit: summary.totalProfit,
    activeMembers: summary.activeMembers,
  };

  if (loading && members.length === 0) {
    return <TablePageSkeleton headerActions={3} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Members"
        description="Manage investors and track their investments and profits."
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setIsBulkEmailOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 h-auto font-bold text-[12px]"
            >
              <Mail size={14} strokeWidth={2.5} />
              Bulk Email
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (noBranches) {
                  toast.error('Create a branch before importing members.');
                  return;
                }
                setIsBulkImportOpen(true);
              }}
              disabled={noBranches}
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 h-auto font-bold text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={14} strokeWidth={2.5} />
              Import CSV
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={noBranches}
              title={
                noBranches ? 'Create a branch before adding members' : undefined
              }
              className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              isLoading={loading && members.length === 0}
            >
              <Plus size={14} strokeWidth={2.5} />
              Add Member
            </Button>
          </div>
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
          amount={formatCurrency(statsDisplay.totalInvested)}
          icon={<Wallet size={20} />}
          color="bg-blue-500 shadow-blue-500/20"
        />
        <StatsCard
          title="Total Profit Distributed"
          amount={formatCurrency(statsDisplay.totalProfit)}
          icon={<DollarSign size={20} />}
          color="bg-purple-500 shadow-purple-500/20"
        />
      </div>

      {/* Tabs and Search */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/[0.04] p-1 rounded-full w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={() => handleTabChange('approved')}
              className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-[12px] font-bold transition-all duration-300 ${
                activeTab === 'approved'
                  ? 'bg-white dark:bg-white/[0.06] shadow-sm text-primary'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Active Members
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleTabChange('pending')}
              className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-[12px] font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-white dark:bg-white/[0.06] shadow-sm text-amber-600'
                  : 'text-slate-500 hover:text-amber-600'
              }`}
            >
              Pending <span className="hidden sm:inline">Approvals</span>
              {pendingMembersCount > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold">
                  {pendingMembersCount}
                </span>
              )}
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
            <TableSearch
              value={searchTerm}
              onChange={(value) => setSearchTerm(value)}
              placeholder="Search members..."
            />
            <div className="w-full sm:w-48">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-11 rounded-full bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] px-4 focus:ring-0">
                  <div className="flex items-center gap-2">
                    <Store size={14} className="text-slate-400" />
                    <SelectValue placeholder="Filter by Branch" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 dark:border-white/[0.06]">
                  <SelectItem value="all" className="rounded-xl">
                    All Branches
                  </SelectItem>
                  {branches.map((branch) => (
                    <SelectItem
                      key={branch._id}
                      value={branch._id}
                      className="rounded-xl"
                    >
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {isMobile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {members.map((member) => (
                <MemberCard
                  key={member._id}
                  member={member}
                  onApprove={handleApproveMember}
                  onReject={handleRejectMember}
                  approvingId={approvingId}
                  rejectingId={rejectingId}
                />
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
                className="border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] rounded-[2rem]"
              />
            )}
          </div>
        ) : (
          <MemberTable
            data={members}
            onDelete={setDeleteMemberId}
            onApprove={handleApproveMember}
            onReject={handleRejectMember}
            approvingId={approvingId}
            rejectingId={rejectingId}
            pagination={{
              currentPage,
              totalPages,
              totalEntries,
              limit,
              onPageChange: (page) => fetchMembers(false, page),
              onLimitChange: (newLimit) => setLimit(newLimit),
            }}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        )}
      </div>

      {/* Modals */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleMemberAdded}
      />

      <BulkImportMembersModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={handleMemberAdded}
      />

      <BulkEmailMembersModal
        isOpen={isBulkEmailOpen}
        onClose={() => setIsBulkEmailOpen(false)}
      />

      <ConfirmActionModal
        isOpen={!!deleteMemberId}
        onClose={() => setDeleteMemberId(null)}
        onConfirm={handleDeleteMember}
        loading={isDeleting}
        title="Delete Member"
        description="Are you sure you want to delete this member? This action cannot be undone and all associated data will be removed."
        confirmText="Permanently Delete"
        variant="danger"
      />

      <ConfirmActionModal
        isOpen={!!rejectMemberId}
        onClose={() => setRejectMemberId(null)}
        onConfirm={confirmRejectMember}
        loading={!!rejectingId}
        title="Reject Application"
        description="Are you sure you want to reject this member's application? They will be notified and will not be able to access the member portal."
        confirmText="Reject Application"
        variant="warning"
      >
        <div className="space-y-3 mt-4">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 px-1">
            Reason for Rejection <span className="text-rose-500">*</span>
          </label>
          <div className="relative group">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Out of Quota, insufficient documentation etc..."
              className="bg-background border border-border/50 rounded-2xl px-5 py-4 text-sm font-medium shadow-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all hover:border-border min-h-[120px] resize-none leading-relaxed"
              required
            />
          </div>
        </div>
      </ConfirmActionModal>
    </div>
  );
};

export default Members;
