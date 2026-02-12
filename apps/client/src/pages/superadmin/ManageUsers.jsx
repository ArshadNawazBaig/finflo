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
  Loader2,
} from 'lucide-react';
import api from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import SendNotificationModal from '@/components/SendNotificationModal';
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const observerTarget = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setLimit(isMobile ? 3 : 10);
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <PageHeader
        title="Manage Users"
        description="View and manage all registered businesses"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-4 py-2 rounded-full bg-muted text-sm font-bold">
            {pagination.total} Total Users
          </span>
          <Button
            onClick={() => setIsNotificationModalOpen(true)}
            variant="gradient"
            className="px-6 py-2.5 rounded-full flex items-center justify-center gap-2.5 text-[11px] font-black uppercase tracking-widest w-full sm:w-auto"
          >
            <Send className="w-4 h-4" />
            Send Notification
          </Button>
        </div>
      </PageHeader>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <input
            type="text"
            placeholder="Search by name, email, or business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-border/50 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-full border transition-all w-full sm:w-auto text-[11px] font-black uppercase tracking-widest ${
            showFilters || filters.plan || filters.status
              ? 'border-primary bg-primary/10 text-primary shadow-sm'
              : 'border-border/50 hover:bg-muted text-muted-foreground'
          }`}
        >
          <Filter size={14} />
          Filters
        </button>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 rounded-2xl bg-card border border-border/50">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">
              Plan
            </label>
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
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">
              Status
            </label>
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
          </div>
          <button
            onClick={() => setFilters({ plan: '', status: '' })}
            className="self-end px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Content Area */}
      {loading && !isFetchingMore && users.length === 0 ? (
        <div className="p-6 space-y-4 rounded-2xl border border-border/50 bg-card">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
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
        <div className="rounded-2xl border border-border/50 overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th
                    className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      User
                      {renderSortIcon('name')}
                    </div>
                  </th>
                  <th
                    className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('businessName')}
                  >
                    <div className="flex items-center">
                      Business
                      {renderSortIcon('businessName')}
                    </div>
                  </th>
                  <th
                    className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('plan')}
                  >
                    <div className="flex items-center">
                      Plan
                      {renderSortIcon('plan')}
                    </div>
                  </th>
                  <th
                    className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('customerCount')}
                  >
                    <div className="flex items-center">
                      Stats
                      {renderSortIcon('customerCount')}
                    </div>
                  </th>
                  <th
                    className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('isActive')}
                  >
                    <div className="flex items-center">
                      Status
                      {renderSortIcon('isActive')}
                    </div>
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {users.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/super-admin/users/${user._id}`}
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                          {user.name?.charAt(0)?.toUpperCase()}
                        </Link>
                        <div>
                          <Link
                            to={`/super-admin/users/${user._id}`}
                            className="font-bold text-sm hover:text-primary transition-colors cursor-pointer block"
                          >
                            {user.name}
                          </Link>
                          <div className="flex flex-col">
                            <p className="text-[10px] text-muted-foreground">
                              {user.email}
                            </p>
                            <Link
                              to={`/super-admin/users/${user._id}`}
                              className="text-[9px] font-black uppercase tracking-tighter text-primary/40 hover:text-primary transition-colors mt-0.5"
                            >
                              ID: {user._id.slice(-8).toUpperCase()}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {user.businessName || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getPlanColor(user.plan)}`}
                      >
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          {user.customerCount} customers
                        </span>
                        <span className="text-muted-foreground">
                          {user.loanCount} loans
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.isActive ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold">
                          <CheckCircle2 size={14} /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-500 text-sm font-bold">
                          <XCircle size={14} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/super-admin/users/${user._id}`}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          onClick={() =>
                            handleToggleStatus(user._id, user.isActive)
                          }
                          className={`p-2 rounded-lg transition-colors ${
                            user.isActive
                              ? 'text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10'
                              : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10'
                          }`}
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {user.isActive ? (
                            <Ban size={16} />
                          ) : (
                            <CheckCircle2 size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteUser(user)}
                          className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete Permanently"
                        >
                          <Trash2 size={16} />
                        </button>
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

      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteUser?.name}</strong>? This will permanently remove
              all their data and business records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteUser();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full px-8"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageUsers;
