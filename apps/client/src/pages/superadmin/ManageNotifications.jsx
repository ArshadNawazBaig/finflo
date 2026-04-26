import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, getSafeNotificationLink } from '@/lib/utils';
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
} from 'lucide-react';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SendNotificationModal from '@/components/notifications/SendNotificationModal';
import NotificationCard from '@/components/notifications/NotificationCard';
import InfiniteLoader from '@/components/InfiniteLoader';
import EmptyState from '@/components/ui/EmptyState';
import { useAtom, useAtomValue } from 'jotai';
import { notificationsAtom, unreadNotificationsCountAtom, userAtom } from '@/atoms';
import { useIsMobile } from '@/hooks/useIsMobile';

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
          ...(search && { search }),
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
    [limit, search, sortBy],
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

  return (
    <div className="relative pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Background Gradients */}
      <div className="fixed inset-0 -z-10 pointer-events-none"></div>

      <div className="space-y-6 relative z-10">
        {/* Header */}
        <PageHeader
          title="Notification History"
          description="View all notifications sent to business owners"
        >
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-black tracking-widest border border-primary/20 backdrop-blur-sm uppercase min-w-[120px] justify-center flex w-full sm:w-auto">
              {pagination.total} TOTAL SENT
            </span>
            <Button
              onClick={handleDeleteAll}
              variant="outline"
              className="px-6 py-2.5 rounded-full flex items-center justify-center gap-2.5 text-[11px] font-black uppercase tracking-widest w-full sm:w-auto border-destructive/20 text-destructive hover:bg-destructive/10"
              disabled={notifications.length === 0}
            >
              <Trash2 className="w-4 h-4" />
              Delete All
            </Button>
            <Button
              onClick={() => setIsNotificationModalOpen(true)}
              variant="gradient"
              className="px-6 py-2.5 rounded-full flex items-center justify-center gap-2.5 text-[11px] font-black uppercase tracking-widest w-full sm:w-auto shadow-lg shadow-primary/20"
            >
              <Send className="w-4 h-4" />
              Send New
            </Button>
          </div>
        </PageHeader>

        {/* Search & Sort */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 group-focus-within:text-primary transition-colors duration-300" />
            <input
              type="text"
              placeholder="Search by title, message, or recipient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 shadow-sm hover:shadow-md"
            />
          </div>
          <div className="space-y-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] h-[54px] rounded-2xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50 bg-card/95 backdrop-blur-md">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          <div className="rounded-[2rem] border border-border/40 bg-card/10 backdrop-blur-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/40">
                      Notification
                    </th>
                    <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/40">
                      Recipient
                    </th>
                    <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/40">
                      Type
                    </th>
                    <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/40">
                      Sent Date
                    </th>
                    <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/40">
                      Status
                    </th>
                    <th className="text-right px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/40">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
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
                        'hover:bg-primary/[0.04] transition-colors',
                        notification.link && 'cursor-pointer',
                      )}
                    >
                      <td className="px-6 py-5">
                        <div className="space-y-0.5">
                          <p className="font-black text-sm tracking-tight text-foreground">
                            {notification.title}
                          </p>
                          <p className="text-xs font-medium text-muted-foreground line-clamp-1 max-w-md">
                            {notification.message}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xs font-black capitalize border border-primary/20">
                            {notification.recipient?.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-sm capitalize tracking-tight text-foreground">
                              {notification.recipient?.name || 'Unknown User'}
                            </p>
                            <p className="text-[10px] font-medium text-muted-foreground">
                              {notification.recipient?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getTypeStyles(
                            notification.type,
                          )}`}
                        >
                          {getTypeIcon(notification.type)}
                          {notification.type}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/70">
                          <Calendar
                            size={14}
                            className="text-muted-foreground/40"
                          />
                          {new Date(
                            notification.createdAt,
                          ).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {notification.read ? (
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle2 size={12} strokeWidth={3} /> Read
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                            <Info size={12} strokeWidth={3} /> Unread
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all active:scale-90"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification._id);
                          }}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-border/40">
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
