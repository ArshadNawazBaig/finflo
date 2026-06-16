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
import { capitalize } from '@/lib/utils';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import Pagination from '@/components/ui/Pagination';
import { ActivityLogsPageSkeleton } from '@/components/ui/PageSkeletons';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import { toast } from 'sonner';
import PillSelect from '@/components/ui/PillSelect';
import ActivityLogCard from '@/components/notifications/ActivityLogCard';
import MemberAvatar from '@/components/member/MemberAvatar';
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
  const observerTarget = useRef(null);
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

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
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

  if (loading && logs.length === 0 && !search && category === 'all') {
    return <ActivityLogsPageSkeleton />;
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
            Activity <span className="text-primary">logs</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Monitor all system activities and user actions in real time.
          </p>
        </div>
        <span className="px-4 py-2 rounded-full bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.15em] border border-slate-100 dark:border-white/[0.06] tabular-nums">
          {pagination.total} total activities
        </span>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 z-10" />
          <Input
            type="text"
            placeholder="Search by user, action, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-full border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all h-auto"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <PillSelect
            value={category || 'all'}
            onValueChange={(value) => setCategory(value === 'all' ? '' : value)}
            placeholder="All categories"
            className="w-full sm:w-[180px]"
            options={[
              { value: 'all', label: 'All categories' },
              { value: 'auth', label: 'Authentication' },
              { value: 'user', label: 'User' },
              { value: 'loan', label: 'Loan' },
              { value: 'customer', label: 'Customer' },
              { value: 'member', label: 'Member' },
              { value: 'notification', label: 'Notification' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          <PillSelect
            value={sortBy}
            onValueChange={setSortBy}
            placeholder="Sort by"
            className="w-full sm:w-[180px]"
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
            ]}
          />
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
        <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] overflow-hidden bg-white dark:bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.06]">
                <tr>
                  <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Time
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    User
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Action
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Category
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {logs.map((log) => (
                  <tr
                    key={log._id}
                    className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                        <Calendar size={12} />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.user ? (
                        <div className="flex items-center gap-3">
                          <MemberAvatar
                            name={log.user.name || 'U'}
                            profilePicture={
                              log.user.businessLogo || log.user.profilePicture
                            }
                            size={36}
                            rounded="rounded-full"
                            className="text-[11px] capitalize"
                          />
                          <div>
                            <p className="font-extrabold text-[13px] capitalize tracking-tight text-slate-900 dark:text-white">
                              {capitalize(log.user.name)}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                              {log.user.email}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                          System
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        {getActionIcon(log.action)}
                        <span className="text-[12px] font-bold">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] border ${getCategoryColor(
                          log.category,
                        )}`}
                      >
                        {log.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium line-clamp-2 max-w-md">
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
