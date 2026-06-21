import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, getSafeNotificationLink, capitalize } from '@/lib/utils';
import {
  Bell,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Send,
  Calendar,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { TablePageSkeleton } from '@/components/ui/PageSkeletons';
import Pagination from '@/components/ui/Pagination';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import PillSelect from '@/components/ui/PillSelect';
import SendNotificationModal from '@/components/notifications/SendNotificationModal';
import NotificationCard from '@/components/notifications/NotificationCard';
import InfiniteLoader from '@/components/InfiniteLoader';
import EmptyState from '@/components/ui/EmptyState';
import { useAtom, useAtomValue } from 'jotai';
import {
  notificationsAtom,
  unreadNotificationsCountAtom,
  userAtom,
} from '@/atoms';
import { useIsMobile } from '@/hooks/useIsMobile';
import useDebounce from '@/hooks/useDebounce';

const ManageNotifications = () => {
  const user = useAtomValue(userAtom);
  const [notifications, setNotifications] = useState([]);
  const [globalNotifs, setGlobalNotifs] = useAtom(notificationsAtom);
  const [unreadCount, setUnreadCount] = useAtom(unreadNotificationsCountAtom);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [limit, setLimit] = useState(5);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [isBulkDelete, setIsBulkDelete] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [sortBy, setSortBy] = useState('newest');
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const observerTarget = useRef(null);

  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
  }, [isMobile]);

  const fetchNotifications = useCallback(
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
          ...(debouncedSearch && { search: debouncedSearch }),
          sortBy,
        });

        const { data } = await api.get(`/notifications/all?${params}`);

        if (isAppend) {
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n._id));
            const newNotifications = (data.notifications || []).filter(
              (n) => !existingIds.has(n._id),
            );
            return [...prev, ...newNotifications];
          });
        } else {
          setNotifications(data.notifications || []);
        }

        setPagination(data.pagination);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        toast.error('Failed to fetch notification history');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [limit, debouncedSearch, sortBy],
  );

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

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
          fetchNotifications(pagination.page + 1, true);
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isMobile, isFetchingMore, pagination, fetchNotifications]);

  const handleDelete = (id) => {
    setIsBulkDelete(false);
    setDeleteConfirmation(id);
  };

  const handleDeleteAll = () => {
    setIsBulkDelete(true);
    setDeleteConfirmation('all');
  };

  const confirmDelete = async () => {
    try {
      const endpoint = isBulkDelete
        ? '/notifications/all'
        : `/notifications/${deleteConfirmation}`;
      await api.delete(endpoint);
      toast.success(
        isBulkDelete
          ? 'All notifications deleted successfully'
          : 'Notification deleted successfully',
      );
      setDeleteConfirmation(null);
      setIsBulkDelete(false);
      if (isBulkDelete) {
        setUnreadCount(0);
        setGlobalNotifs([]);
      } else {
        const deletedNotif = notifications.find(
          (n) => n._id === deleteConfirmation,
        );
        if (deletedNotif && !deletedNotif.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        setGlobalNotifs((prev) =>
          prev.filter((n) => n._id !== deleteConfirmation),
        );
      }
      fetchNotifications(1);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setGlobalNotifs((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-500" />;
      case 'error':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <Info size={16} className="text-blue-500" />;
    }
  };

  const getTypeStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  if (loading && notifications.length === 0 && !search) {
    return <TablePageSkeleton />;
  }

  return (
    <div className="relative pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Background Gradients */}
      <div className="fixed inset-0 -z-10 pointer-events-none"></div>

      <div className="space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-6 pt-1">
          <div className="space-y-2 max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Super admin
            </p>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-[-0.035em] leading-tight text-slate-900 dark:text-white">
              Notification <span className="text-primary">history</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              View all notifications sent to business owners across the
              platform.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <span className="px-4 py-2 rounded-full bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.15em] border border-slate-100 dark:border-white/[0.06] tabular-nums">
              {pagination.total} total sent
            </span>
            <Button
              onClick={handleDeleteAll}
              variant="outline"
              className="px-5 py-2.5 h-auto rounded-full flex items-center justify-center gap-2 text-[12px] font-bold border-rose-500/20 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
              disabled={notifications.length === 0}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete all
            </Button>
            <Button
              onClick={() => setIsNotificationModalOpen(true)}
              className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <Send size={14} strokeWidth={2.5} />
              Send new
              <span className="ml-0.5 w-6 h-6 rounded-full bg-white text-primary flex items-center justify-center">
                <ArrowUpRight size={12} strokeWidth={3} />
              </span>
            </Button>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 z-10 group-focus-within:text-primary transition-colors duration-300" />
            <Input
              type="text"
              placeholder="Search by title, message, or recipient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-auto pl-12 pr-4 py-3 rounded-full border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            />
          </div>
          <PillSelect
            value={sortBy}
            onValueChange={setSortBy}
            placeholder="Sort by"
            className="w-[180px]"
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
            ]}
          />
        </div>

        {/* Content Area */}
        {loading && !isFetchingMore && notifications.length === 0 ? (
          <div className="p-6 space-y-4 rounded-2xl border border-border/50 bg-card">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No Notifications Found"
            description={
              search
                ? "We couldn't find any notifications matching your search."
                : 'Your broadcast history is currently empty. Start by sending a notification to all users.'
            }
            className="border-none bg-card/50"
          />
        ) : isMobile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification._id}
                  notification={notification}
                  onDelete={handleDelete}
                  onMarkAsRead={handleMarkAsRead}
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
          <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.06]">
                  <tr>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Notification
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Recipient
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Type
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Sent date
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Status
                    </th>
                    <th className="text-right px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {notifications.map((notification) => (
                    <tr
                      key={notification._id}
                      onClick={() => {
                        if (!notification.read) {
                          handleMarkAsRead(notification._id);
                        }
                        if (notification.link) {
                          const safeLink = getSafeNotificationLink(
                            notification.link,
                            user?.role,
                          );
                          if (safeLink) {
                            navigate(safeLink);
                          }
                        }
                      }}
                      className={cn(
                        'hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors',
                        notification.link && 'cursor-pointer',
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-[13px] tracking-tight text-slate-900 dark:text-white">
                            {notification.title}
                          </p>
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1 max-w-md">
                            {notification.message}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[11px] font-extrabold capitalize">
                            {notification.recipient?.name
                              ?.charAt(0)
                              ?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-extrabold text-[13px] capitalize tracking-tight text-slate-900 dark:text-white">
                              {capitalize(notification.recipient?.name) ||
                                'Unknown User'}
                            </p>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                              {notification.recipient?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] border ${getTypeStyles(
                            notification.type,
                          )}`}
                        >
                          {getTypeIcon(notification.type)}
                          {notification.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          <Calendar
                            size={12}
                            className="text-slate-400 dark:text-slate-500"
                          />
                          {new Date(
                            notification.createdAt,
                          ).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {notification.read ? (
                          <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-[0.12em] flex items-center gap-1">
                            <CheckCircle2 size={11} strokeWidth={3} /> Read
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] flex items-center gap-1">
                            <Info size={11} strokeWidth={3} /> Unread
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification._id);
                          }}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-5 border-t border-slate-100 dark:border-white/[0.06]">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.pages}
                totalEntries={pagination.total}
                limit={limit}
                onPageChange={(page) => fetchNotifications(page)}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                }}
              />
            </div>
          </div>
        )}

        <SendNotificationModal
          isOpen={isNotificationModalOpen}
          onClose={() => {
            setIsNotificationModalOpen(false);
            fetchNotifications(1); // Refresh list after sending
          }}
        />

        <AlertDialog
          open={!!deleteConfirmation}
          onOpenChange={(open) => !open && setDeleteConfirmation(null)}
        >
          <AlertDialogContent className="rounded-lg border-border/50 bg-card shadow-2xl p-8 max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black tracking-tighter text-center">
                {isBulkDelete ? 'Delete All History?' : 'Delete Alert?'}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center font-bold text-muted-foreground text-sm pt-2">
                {isBulkDelete
                  ? 'Are you sure you want to clear your entire notification history? This action will remove all recorded broadcast alerts.'
                  : 'This will permanently delete the notification from the history. This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col sm:flex-row gap-3 mt-8">
              <AlertDialogCancel className="w-full rounded-2xl border-none bg-muted h-12 font-black uppercase tracking-widest text-[10px] hover:bg-muted/80 hover:text-primary">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="w-full bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] text-white shadow-xl shadow-destructive/20"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default ManageNotifications;
