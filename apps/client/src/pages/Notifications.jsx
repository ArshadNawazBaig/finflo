import { useState, useEffect } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/ui/EmptyState';
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

const Notifications = () => {
  const [allNotifications, setAllNotifications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [limit, setLimit] = useState(10);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/notifications');
      setAllNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Client-side filtering, sorting, and pagination
    let result = [...allNotifications];

    // Filter by search
    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(lowerSearch) ||
          n.message.toLowerCase().includes(lowerSearch),
      );
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // Pagination
    const total = result.length;
    const pages = Math.ceil(total / limit) || 1;
    // Adjust page if out of bounds due to filtering
    const safePage = Math.min(Math.max(1, pagination.page), pages);

    const start = (safePage - 1) * limit;
    const end = start + limit;
    const paginatedResult = result.slice(start, end);

    setNotifications(paginatedResult);
    setPagination((prev) => ({ ...prev, page: safePage, pages, total }));
  }, [allNotifications, search, sortBy, pagination.page, limit]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      // Update local state directly
      setAllNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to update notification');
    }
  };

  const handleDelete = (id) => {
    setDeleteConfirmation(id);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/notifications/${deleteConfirmation}`);
      toast.success('Notification deleted successfully');
      setDeleteConfirmation(null);
      // Remove from local state
      setAllNotifications((prev) =>
        prev.filter((n) => n._id !== deleteConfirmation),
      );
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

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

  return (
    <div className="relative pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Background Gradients */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <div className="space-y-6 relative z-10">
        {/* Header */}
        <PageHeader
          title="Notifications"
          description="Stay updated with important alerts and messages"
        >
          <div className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20 backdrop-blur-sm">
            {pagination.total} Total Notifications
          </div>
        </PageHeader>

        {/* Search & Sort */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 group-focus-within:text-primary transition-colors duration-300" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-4 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 shadow-sm hover:shadow-md"
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

        {/* Notifications List */}
        <div className="space-y-4">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl w-full" />
            ))
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No Notifications Yet"
              description={
                search
                  ? "We couldn't find any notifications matching your search."
                  : "Running smoothly! We'll notify you when something important happens."
              }
              className="border-none bg-card/50"
            />
          ) : (
            <div className="grid gap-4">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 p-4 sm:p-5 ${
                    notification.read
                      ? 'bg-card/30 border-border/40 hover:bg-card/50 hover:border-border/60'
                      : 'bg-card/80 border-primary/20 hover:bg-card hover:border-primary/40 shadow-lg shadow-primary/5'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl shrink-0 ${getTypeStyles(notification.type)}`}
                    >
                      {getTypeIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <h3
                          className={`font-bold text-base ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}
                        >
                          {notification.title}
                        </h3>
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-lg">
                          <Calendar size={12} />
                          {new Date(
                            notification.createdAt,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <p
                        className={`text-sm leading-relaxed mb-3 ${!notification.read ? 'text-foreground/80' : 'text-muted-foreground/80'}`}
                      >
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <Button
                            onClick={() => handleMarkAsRead(notification._id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg text-xs font-bold text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <Check size={14} className="mr-1.5" />
                            Mark as Read
                          </Button>
                        )}
                        <div className="grow" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          onClick={() => handleDelete(notification._id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {!notification.read && (
                    <div className="absolute top-5 right-0 w-1 h-8 bg-primary rounded-l-full" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {notifications.length > 0 && (
          <div>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              totalEntries={pagination.total}
              limit={limit}
              onPageChange={(page) =>
                setPagination((prev) => ({ ...prev, page }))
              }
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            />
          </div>
        )}
      </div>

      <AlertDialog
        open={!!deleteConfirmation}
        onOpenChange={(open) => !open && setDeleteConfirmation(null)}
      >
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">
              Delete Notification?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">
              This will permanently remove this notification from your history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-none bg-muted font-bold hover:bg-muted/80">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 rounded-xl font-bold text-white shadow-lg shadow-destructive/30"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Notifications;
