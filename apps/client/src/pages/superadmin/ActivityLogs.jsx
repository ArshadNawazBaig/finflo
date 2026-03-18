import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScrollText,
  Search,
  Calendar,
  User,
  Shield,
  LogIn,
  UserPlus,
  Key,
  Bell,
  FileEdit,
  Trash2,
} from 'lucide-react';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import Pagination from '@/components/ui/Pagination';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ActivityLogCard from '@/components/notifications/ActivityLogCard';
import InfiniteLoader from '@/components/InfiniteLoader';
import EmptyState from '@/components/ui/EmptyState';
import { useIsMobile } from '@/hooks/useIsMobile';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [limit, setLimit] = useState(DESKTOP_PAGE_LIMIT);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const isMobile = useIsMobile();
  const skipNextEffect = useRef(false);

  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
  }, [isMobile]);

  const fetchLogs = useCallback(
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
          ...(search && { search }),
          ...(category && category !== 'all' && { category }),
          sortBy,
        });

        const { data } = await api.get(`/activity-logs?${params}`);

        if (isAppend) {
          setLogs((prev) => {
            const existingIds = new Set(prev.map((l) => l._id));
            const newLogs = (data.logs || []).filter(
              (l) => !existingIds.has(l._id),
            );
            return [...prev, ...newLogs];
          });
        } else {
          setLogs(data.logs || []);
        }

        setPagination(data.pagination);
      } catch (error) {
        console.error('Failed to fetch activity logs:', error);
        toast.error('Failed to fetch activity logs');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [limit, search, category, sortBy],
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

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
          fetchLogs(pagination.page + 1, true);
        }
      },
      { threshold: 1.0 },
    );


  }, [isMobile, isFetchingMore, pagination, fetchLogs]);

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'auth':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'user':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'loan':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'customer':
        return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
      case 'member':
        return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
      case 'notification':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'admin':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border/20';
    }
  };

  const getActionIcon = (action) => {
    if (action.includes('login')) return <LogIn size={14} />;
    if (action.includes('registered')) return <UserPlus size={14} />;
    if (action.includes('password')) return <Key size={14} />;
    if (action.includes('notification')) return <Bell size={14} />;
    if (action.includes('updated')) return <FileEdit size={14} />;
    if (action.includes('deleted')) return <Trash2 size={14} />;
    if (action.includes('admin')) return <Shield size={14} />;
    return <User size={14} />;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <PageHeader
        title="Activity Logs"
        description="Monitor all system activities and user actions"
      >
        <span className="px-4 py-2 rounded-full bg-muted text-sm font-bold">
          {pagination.total} Total Activities
        </span>
      </PageHeader>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <input
            type="text"
            placeholder="Search by user, action, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-border/50 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <Select
            value={category || 'all'}
            onValueChange={(value) => setCategory(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-full sm:w-[180px] h-[48px] rounded-2xl">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="auth">Authentication</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="loan">Loan</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="notification">Notification</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[180px] h-[48px] rounded-2xl">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Area */}
      {loading && !isFetchingMore && logs.length === 0 ? (
        <TableSkeleton />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No Logs Found"
          description={
            search || category
              ? "We couldn't find any activity logs matching your filters."
              : 'Activity logs will appear here once system actions occur.'
          }
          className="border-none bg-card/50"
        />
      ) : isMobile ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {logs.map((log) => (
              <ActivityLogCard key={log._id} log={log} />
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
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Time
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    User
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Action
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Category
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {logs.map((log) => (
                  <tr
                    key={log._id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar size={14} />
                        <span className="font-medium">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.user ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold capitalize">
                            {log.user.name?.charAt(0) || 'U'}
                          </div>
                          <div className="text-sm">
                            <p className="font-medium capitalize">
                              {log.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {log.user.email}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          System
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="text-sm font-medium">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize border ${getCategoryColor(
                          log.category,
                        )}`}
                      >
                        {log.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                        {log.details}
                      </p>
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
            onPageChange={(page) => fetchLogs(page)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;
