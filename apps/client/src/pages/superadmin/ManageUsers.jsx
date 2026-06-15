import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Search,
  Filter,
  Eye,
  Trash2,
  Ban,
  CheckCircle2,
  XCircle,
  Users,
  Building2,
  Send,
  ArrowUpRight,
} from 'lucide-react';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import Pagination from '@/components/ui/Pagination';
import { TablePageSkeleton } from '@/components/ui/PageSkeletons';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ui/FormField';
import MemberAvatar from '@/components/member/MemberAvatar';
import SendNotificationModal from '@/components/notifications/SendNotificationModal';
import UserCard from '@/components/UserCard';
import InfiniteLoader from '@/components/InfiniteLoader';
import EmptyState from '@/components/ui/EmptyState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import { useIsMobile } from '@/hooks/useIsMobile';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ plan: '', status: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const isMobile = useIsMobile();

  const observerTarget = useRef(null);

  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
  }, [isMobile]);

  const fetchUsers = useCallback(
    async (page = 1, isAppend = false) => {
      try {
        if (isAppend) {
          setIsFetchingMore(true);
        } else {
          setLoading(true);
        }

        const params = new URLSearchParams({
          page,
          limit,
          sortBy,
          sortOrder,
          ...(search && { search }),
          ...(filters.plan && { plan: filters.plan }),
          ...(filters.status && { status: filters.status }),
        });

        const { data } = await api.get(`/super-admin/users?${params}`);

        if (isAppend) {
          setUsers((prev) => {
            const existingIds = new Set(prev.map((u) => u._id));
            const newUsers = (data.users || []).filter(
              (u) => !existingIds.has(u._id),
            );
            return [...prev, ...newUsers];
          });
        } else {
          setUsers(data.users);
        }

        setPagination(data.pagination);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        toast.error('Failed to fetch users');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [limit, sortBy, sortOrder, search, filters],
  );

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          pagination.page < pagination.pages
        ) {
          fetchUsers(pagination.page + 1, true);
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isMobile, isFetchingMore, pagination, fetchUsers]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (column) => {
    if (sortBy !== column)
      return (
        <ChevronsUpDown size={14} className="ml-1 text-muted-foreground/50" />
      );
    return sortOrder === 'asc' ? (
      <ArrowUp size={14} className="ml-1 text-primary" />
    ) : (
      <ArrowDown size={14} className="ml-1 text-primary" />
    );
  };

  const handleToggleStatus = async (userId, isActive) => {
    try {
      await api.put(`/super-admin/users/${userId}`, { isActive: !isActive });
      toast.success(
        `User ${isActive ? 'deactivated' : 'activated'} successfully`,
      );
      fetchUsers(pagination.page);
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    try {
      setDeleting(true);
      await api.delete(`/super-admin/users/${deleteUser._id}?permanent=true`);
      toast.success('User deleted permanently');
      setDeleteUser(null);
      fetchUsers(1);
    } catch (error) {
      toast.error('Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'Pro':
        return 'btn-gradient text-white';
      case 'Basic':
        return 'bg-indigo-500/10 text-indigo-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (
    loading &&
    users.length === 0 &&
    !search &&
    !filters.plan &&
    !filters.status
  ) {
    return <TablePageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-6 pt-1">
        <div className="space-y-2 max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
            Super admin
          </p>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-[-0.035em] leading-tight text-slate-900 dark:text-white">
            Manage <span className="text-primary">users</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            View and manage all registered businesses across the platform.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <span className="px-4 py-2 rounded-full bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.15em] border border-slate-100 dark:border-white/[0.06] tabular-nums">
            {pagination.total} total
          </span>
          <Button
            onClick={() => setIsNotificationModalOpen(true)}
            className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
          >
            <Send size={14} strokeWidth={2.5} />
            Notify all
            <span className="ml-0.5 w-6 h-6 rounded-full bg-white text-primary flex items-center justify-center">
              <ArrowUpRight size={12} strokeWidth={3} />
            </span>
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 z-10" />
          <Input
            type="text"
            placeholder="Search by name, email, or business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-auto pl-12 pr-4 py-3 rounded-full border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </div>
        <Button
          variant="ghost"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-full border transition-all w-full sm:w-auto text-[11px] font-bold uppercase tracking-[0.15em] ${
            showFilters || filters.plan || filters.status
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-500 dark:text-slate-400'
          }`}
        >
          <Filter size={13} />
          Filters
        </Button>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 p-5 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
          <FormField
            label="Plan"
            labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500"
          >
            <Select
              value={filters.plan}
              onValueChange={(value) =>
                setFilters({ ...filters, plan: value === 'all' ? '' : value })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="Free">Free</SelectItem>
                <SelectItem value="Basic">Basic</SelectItem>
                <SelectItem value="Pro">Pro</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Status"
            labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500"
          >
            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters({ ...filters, status: value === 'all' ? '' : value })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <Button
            variant="ghost"
            onClick={() => setFilters({ plan: '', status: '' })}
            className="self-end px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Clear filters
          </Button>
        </div>
      )}

      {/* Content Area */}
      {loading && !isFetchingMore && users.length === 0 ? (
        <TableSkeleton />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Businesses Found"
          description="We couldn't find any registered platforms matching your current filters."
          className="border-none bg-card/50"
        />
      ) : isMobile ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {users.map((user) => (
              <UserCard
                key={user._id}
                user={user}
                onToggleStatus={handleToggleStatus}
                onDelete={setDeleteUser}
              />
            ))}
          </div>

          {/* Infinite Scroll Trigger */}
          {pagination.page < pagination.pages && (
            <div ref={observerTarget}>
              <InfiniteLoader isFetchingMore={isFetchingMore} />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] overflow-hidden bg-white dark:bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.06]">
                <tr>
                  <th
                    className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      User
                      {renderSortIcon('name')}
                    </div>
                  </th>
                  <th
                    className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    onClick={() => handleSort('businessName')}
                  >
                    <div className="flex items-center">
                      Business
                      {renderSortIcon('businessName')}
                    </div>
                  </th>
                  <th
                    className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    onClick={() => handleSort('plan')}
                  >
                    <div className="flex items-center">
                      Plan
                      {renderSortIcon('plan')}
                    </div>
                  </th>
                  <th
                    className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    onClick={() => handleSort('customerCount')}
                  >
                    <div className="flex items-center">
                      Stats
                      {renderSortIcon('customerCount')}
                    </div>
                  </th>
                  <th
                    className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    onClick={() => handleSort('isActive')}
                  >
                    <div className="flex items-center">
                      Status
                      {renderSortIcon('isActive')}
                    </div>
                  </th>
                  <th className="text-right px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {users.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/super-admin/users/${user._id}`}
                          className="inline-flex shrink-0 hover:brightness-110 transition-all"
                        >
                          <MemberAvatar
                            name={user.businessName || user.name}
                            profilePicture={
                              user.businessLogo || user.profilePicture
                            }
                            size={40}
                            rounded="rounded-full"
                            className="text-sm capitalize"
                          />
                        </Link>
                        <div>
                          <Link
                            to={`/super-admin/users/${user._id}`}
                            className="font-extrabold text-[13px] text-slate-900 dark:text-white hover:text-primary transition-colors cursor-pointer block capitalize tracking-tight"
                          >
                            {user.name}
                          </Link>
                          <div className="flex flex-col">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {user.email}
                            </p>
                            <Link
                              to={`/super-admin/users/${user._id}`}
                              className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-300 dark:text-slate-600 hover:text-primary transition-colors mt-0.5"
                            >
                              ID: {user._id.slice(-8).toUpperCase()}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">
                          {user.businessName || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] ${getPlanColor(user.plan)}`}
                      >
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 text-[12px] font-medium tabular-nums">
                        <span className="text-slate-500 dark:text-slate-400">
                          {user.customerCount} customers
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {user.loanCount} loans
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.isActive ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 text-[12px] font-extrabold">
                          <CheckCircle2 size={13} /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-rose-500 text-[12px] font-extrabold">
                          <XCircle size={13} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/super-admin/users/${user._id}`}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </Link>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            handleToggleStatus(user._id, user.isActive)
                          }
                          className={`p-2 rounded-full transition-colors ${
                            user.isActive
                              ? 'text-slate-400 dark:text-slate-500 hover:text-orange-500 hover:bg-orange-500/10'
                              : 'text-slate-400 dark:text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10'
                          }`}
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {user.isActive ? (
                            <Ban size={15} />
                          ) : (
                            <CheckCircle2 size={15} />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setDeleteUser(user)}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors"
                          title="Delete Permanently"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination (Desktop) */}
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            totalEntries={pagination.total}
            limit={limit}
            onPageChange={(page) => fetchUsers(page)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
            }}
          />
        </div>
      )}

      <SendNotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />

      <ConfirmActionModal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDeleteUser}
        loading={deleting}
        title="Delete User Permanently"
        description={
          <>
            Are you sure you want to delete <strong>{deleteUser?.name}</strong>?
            This will permanently remove all their data and business records.
            This action cannot be undone.
          </>
        }
        confirmText="Confirm Deletion"
        variant="danger"
      />
    </div>
  );
};

export default ManageUsers;
