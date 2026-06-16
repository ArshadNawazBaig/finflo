import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Calendar,
  Trash2,
  Check,
} from 'lucide-react';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { cn, getSafeNotificationLink } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EmptyState from '@/components/ui/EmptyState';
import InfiniteLoader from '@/components/InfiniteLoader';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAtom, useAtomValue } from 'jotai';
import {
  notificationsAtom,
  unreadNotificationsCountAtom,
  memberAtom,
} from '@/atoms';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MemberNotificationsPageSkeleton } from '@/components/ui/PageSkeletons';

const MemberNotifications = () => {
  const member = useAtomValue(memberAtom);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const [globalNotifs, setGlobalNotifs] = useAtom(notificationsAtom);
  const [unreadCount, setUnreadCount] = useAtom(unreadNotificationsCountAtom);
  const [limit, setLimit] = useState(10);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const observerTarget = useRef(null);
  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
  }, [isMobile]);

  const fetchNotifications = useCallback(
    async (page = 1, isAppend = false) => {
      try {
        if (!isAppend) {
          setLoading(true);
        } else {
          setIsFetchingMore(true);
        }

        const { data } = await api.get(
          `/member-notifications?page=${page}&limit=${limit}&search=${search}&sortBy=${sortBy}`,
        );

        const newNotifications = data.notifications || [];
        if (isAppend) {
          setNotifications((prev) => [...prev, ...newNotifications]);
        } else {
          setNotifications(newNotifications);
        }

        if (data.pagination) {
          setPagination({
            page: data.pagination.page,
            pages: data.pagination.pages,
            total: data.pagination.total,
          });
        }
        setUnreadCount(data.unreadCount || 0);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        toast.error('Failed to fetch notifications');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [limit, search, sortBy],
  );

  useEffect(() => {
    fetchNotifications(1, false);
  }, [limit, search, sortBy, fetchNotifications]);

  // Intersection Observer for Infinite Scroll (Mobile)
  useEffect(() => {
    if (!isMobile || !observerTarget.current) return;

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
      { threshold: 0.1 },
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [
    isMobile,
    isFetchingMore,
    pagination.page,
    pagination.pages,
    fetchNotifications,
  ]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/member-notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Sync with global notifications atom (Navbar dropdown)
      setGlobalNotifs((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );

      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put(`/member-notifications/all/read`);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      setGlobalNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  const handleDeleteAll = () => {
    setDeleteConfirmation('all');
  };

  const handleDelete = (id) => {
    setDeleteConfirmation(id);
  };

  const confirmDelete = async () => {
    try {
      const isBulk = deleteConfirmation === 'all';
      const endpoint = isBulk
        ? '/member-notifications/all'
        : `/member-notifications/${deleteConfirmation}`;

      await api.delete(endpoint);
      toast.success(
        isBulk
          ? 'All notifications deleted successfully'
          : 'Notification deleted successfully',
      );
      setDeleteConfirmation(null);

      if (isBulk) {
        setNotifications([]);
        setPagination((prev) => ({ ...prev, total: 0, page: 1, pages: 1 }));
        setUnreadCount(0);
        setGlobalNotifs([]);
      } else {
        const deletedNotif = notifications.find(
          (n) => n._id === deleteConfirmation,
        );
        if (deletedNotif && !deletedNotif.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        setNotifications((prev) =>
          prev.filter((n) => n._id !== deleteConfirmation),
        );
        // Sync with global notifications atom
        setGlobalNotifs((prev) =>
          prev.filter((n) => n._id !== deleteConfirmation),
        );
        setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
        // Refetch if page is now empty
        if (notifications.length === 1 && pagination.page > 1) {
          const newPage = pagination.page - 1;
          setPagination((prev) => ({ ...prev, page: newPage }));
          fetchNotifications(newPage, false);
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className="text-emerald-500" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-amber-500" />;
      case 'error':
        return <XCircle size={18} className="text-red-500" />;
      default:
        return <Info size={18} className="text-blue-500" />;
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
    return <MemberNotificationsPageSkeleton />;
  }

  return (
    <div className="relative pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Background Gradients */}
      <div className="fixed inset-0 -z-10 pointer-events-none"></div>

      <div className="space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader
            title="Notifications"
            description="Stay updated with your account activity and alerts"
          />
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                variant="outline"
                size="sm"
                className="rounded-full font-bold border-slate-100 dark:border-white/[0.06] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-300"
              >
                <Check size={14} strokeWidth={2.5} className="mr-2" />
                Mark all read
              </Button>
            )}
            <Button
              onClick={handleDeleteAll}
              variant="outline"
              size="sm"
              className="rounded-full font-bold border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-all duration-300"
              disabled={notifications.length === 0}
            >
              <Trash2 size={14} strokeWidth={2.5} className="mr-2" />
              Delete all
            </Button>
            <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold tracking-[0.15em] uppercase tabular-nums">
              {unreadCount} unread
            </span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 group-focus-within:text-primary transition-colors duration-300" />
            <Input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-auto pl-11 pr-4 py-3 rounded-full border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300"
            />
          </div>
          <div className="flex gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] h-12 rounded-full border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] transition-all duration-300">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100 dark:border-white/[0.06]">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notifications View */}
        <div className="space-y-4">
          {loading ? (
            <MemberNotificationsPageSkeleton />
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No Notifications Found"
              description={
                search
                  ? "We couldn't find any notifications matching your search."
                  : "You're all caught up! No recent activity to show."
              }
              className="border-none bg-card/50 py-20"
            />
          ) : isMobile ? (
            /* Mobile Card View with Infinite Scroll */
            <div className="grid gap-4">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => {
                    if (!notification.read) {
                      handleMarkAsRead(notification._id);
                    }
                    if (notification.link) {
                      const safeLink = getSafeNotificationLink(
                        notification.link,
                        member?.role || 'member',
                      );
                      if (safeLink) {
                        navigate(safeLink);
                      }
                    }
                  }}
                  className={cn(
                    'group relative overflow-hidden rounded-lg border transition-all duration-500 p-5',
                    notification.read
                      ? 'bg-muted/10 border-border/40 hover:bg-muted/20 shadow-sm hover:shadow-md'
                      : 'bg-card border-primary/20 shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10',
                    notification.link && 'cursor-pointer active:scale-[0.98]',
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl shrink-0 ${getTypeStyles(notification.type)}`}
                    >
                      {getTypeIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3
                          className={`font-black text-sm tracking-tight ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}
                        >
                          {notification.title}
                        </h3>
                        <span className="text-[10px] font-black text-muted-foreground whitespace-nowrap flex items-center gap-1 bg-muted px-2 py-1 rounded-lg">
                          <Calendar size={10} />
                          {new Date(
                            notification.createdAt,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <p
                        className={`text-xs leading-relaxed mb-4 font-medium ${!notification.read ? 'text-foreground/80' : 'text-muted-foreground/80'}`}
                      >
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification._id);
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/10 px-3"
                          >
                            <Check size={14} className="mr-1.5" />
                            Read
                          </Button>
                        )}
                        <div className="grow" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification._id);
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {!notification.read && (
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-primary" />
                  )}
                </div>
              ))}
              <div ref={observerTarget} className="py-4">
                {isFetchingMore && (
                  <InfiniteLoader isFetchingMore={true} className="py-6" />
                )}
                {!isFetchingMore &&
                  pagination.page >= pagination.pages &&
                  notifications.length > 0 && (
                    <div className="text-center py-8">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                        End of notifications
                      </span>
                    </div>
                  )}
              </div>
            </div>
          ) : (
            /* Desktop Table View */
            <div className="rounded-lg border border-border/50 bg-card overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50 bg-muted/30">
                    <TableHead className="w-[80px] font-black text-[10px] uppercase tracking-widest">
                      Type
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">
                      Content
                    </TableHead>
                    <TableHead className="w-[120px] font-black text-[10px] uppercase tracking-widest">
                      Date
                    </TableHead>
                    <TableHead className="w-[100px] font-black text-[10px] uppercase tracking-widest">
                      Status
                    </TableHead>
                    <TableHead className="w-[100px] text-right font-black text-[10px] uppercase tracking-widest">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow
                      key={notification._id}
                      onClick={() => {
                        if (!notification.read) {
                          handleMarkAsRead(notification._id);
                        }
                        if (notification.link) {
                          const safeLink = getSafeNotificationLink(
                            notification.link,
                            member?.role || 'member',
                          );
                          if (safeLink) {
                            navigate(safeLink);
                          }
                        }
                      }}
                      className={cn(
                        'group border-border/40 transition-colors',
                        !notification.read
                          ? 'bg-primary/[0.02] hover:bg-primary/[0.04]'
                          : 'hover:bg-muted/20',
                        notification.link && 'cursor-pointer',
                      )}
                    >
                      <TableCell>
                        <div
                          className={cn(
                            'p-2 w-fit rounded-lg',
                            getTypeStyles(notification.type),
                          )}
                        >
                          {getTypeIcon(notification.type)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="space-y-0.5">
                          <div
                            className={cn(
                              'text-sm font-black tracking-tight',
                              !notification.read
                                ? 'text-foreground'
                                : 'text-muted-foreground',
                            )}
                          >
                            {notification.title}
                          </div>
                          <div
                            className={cn(
                              'text-xs font-medium line-clamp-2',
                              !notification.read
                                ? 'text-foreground/70'
                                : 'text-muted-foreground/60',
                            )}
                          >
                            {notification.message}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-muted-foreground/70">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={notification.read ? 'ghost' : 'default'}
                          className={cn(
                            'text-[9px] font-black uppercase tracking-widest h-5',
                            notification.read
                              ? 'bg-muted/50 text-muted-foreground'
                              : 'bg-primary text-white',
                          )}
                        >
                          {notification.read ? 'READ' : 'UNREAD'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification._id);
                              }}
                            >
                              <Check size={16} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification._id);
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-4 border-t border-border/40">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.pages}
                  totalEntries={pagination.total}
                  limit={limit}
                  onPageChange={(page) => {
                    setPagination((prev) => ({ ...prev, page }));
                    fetchNotifications(page, false);
                  }}
                  onLimitChange={(newLimit) => {
                    setLimit(newLimit);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirmation}
        onOpenChange={(open) => !open && setDeleteConfirmation(null)}
      >
        <AlertDialogContent className="rounded-[2.5rem] border-border/50 bg-card/95 backdrop-blur-2xl shadow-2xl p-8 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter text-center">
              {deleteConfirmation === 'all'
                ? 'Clear Notifications?'
                : 'Delete Alert?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center font-bold text-muted-foreground text-sm pt-2">
              {deleteConfirmation === 'all'
                ? 'Are you sure you want to delete all notifications? This action cannot be undone.'
                : 'This message will be permanently removed. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-3 mt-8">
            <AlertDialogCancel className="w-full rounded-2xl border-none bg-muted h-12 font-black uppercase tracking-widest text-[10px] hover:bg-muted/80">
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
  );
};

export default MemberNotifications;
