import { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Send,
  Calendar,
  User,
  Trash2,
} from 'lucide-react';
import api from '@/lib/axios';
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
import SendNotificationModal from '@/components/SendNotificationModal';

const ManageNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [limit, setLimit] = useState(10);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const fetchNotifications = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit,
        ...(search && { search }),
        sortBy,
      });
      const { data } = await api.get(`/notifications/all?${params}`);
      setNotifications(data.notifications);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to fetch notification history');
    } finally {
      setLoading(false);
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
      fetchNotifications(pagination.page);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchNotifications(1);
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, sortBy, limit]);

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <PageHeader
        title="Notification History"
        description="View all notifications sent to business owners"
      >
        <div className="flex items-center gap-3">
          <span className="px-4 py-3 rounded-full bg-muted text-sm font-bold min-w-[120px] justify-center flex">
            {pagination.total} Total Sent
          </span>
          <Button
            onClick={() => setIsNotificationModalOpen(true)}
            variant="gradient"
            className="px-6 py-2.5 rounded-full flex items-center justify-center gap-2.5 text-[11px] font-black uppercase tracking-widest w-full sm:w-auto"
          >
            <Send className="w-4 h-4" />
            Send New
          </Button>
        </div>
      </PageHeader>

      {/* Search & Sort */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <input
            type="text"
            placeholder="Search by title, message, or recipient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-border/50 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="space-y-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] h-[48px] rounded-2xl">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="rounded-2xl border border-border/50 overflow-hidden bg-card">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-bold text-lg">No notifications found</p>
            <p className="text-muted-foreground text-sm">
              {search
                ? 'Try adjusting your search'
                : 'Start by sending a notification to your users'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Notification
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Recipient
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Type
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Sent Date
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {notifications.map((notification) => (
                  <tr
                    key={notification._id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="font-bold text-sm">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                          {notification.message}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {notification.recipient?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">
                            {notification.recipient?.name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {notification.recipient?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize border ${getTypeStyles(
                          notification.type,
                        )}`}
                      >
                        {getTypeIcon(notification.type)}
                        {notification.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar size={14} />
                        {new Date(notification.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {notification.read ? (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Read
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                          <Info size={12} /> Unread
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full"
                        onClick={() => handleDelete(notification._id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.pages}
        totalEntries={pagination.total}
        limit={limit}
        onPageChange={(page) => fetchNotifications(page)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          fetchNotifications(1);
        }}
      />

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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              notification from the history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-gradient-to-r from-red-500 to-destructive text-white shadow-xl shadow-red-500/20 hover:brightness-110 hover:shadow-2xl hover:shadow-red-500/30"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageNotifications;
