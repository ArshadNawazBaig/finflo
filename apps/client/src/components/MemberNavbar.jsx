import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Menu,
  Sun,
  Moon,
  Check,
  X,
  Loader2,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { cn, capitalize } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';

const MemberNavbar = ({ onMenuClick }) => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const memberToken = localStorage.getItem('memberToken');
      const { data } = await api.get('/member-notifications', {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const markAsRead = async (id) => {
    try {
      const memberToken = localStorage.getItem('memberToken');
      await api.put(
        `/member-notifications/${id}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${memberToken}` },
        },
      );
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      const memberToken = localStorage.getItem('memberToken');
      await api.put(
        '/member-notifications/all/read',
        {},
        {
          headers: { Authorization: `Bearer ${memberToken}` },
        },
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('memberToken');
    localStorage.removeItem('member');
    toast.success('Logged out successfully');
    navigate('/member/login');
  };

  const member = JSON.parse(localStorage.getItem('member') || '{}');
  const memberInitials = member.name
    ? member.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'M';

  return (
    <div className="h-16 border-b border-border/50 bg-card/50 backdrop-blur-sm px-4 md:px-8 flex items-center justify-between sticky top-0 z-40">
      {/* Left Side - Menu Toggle (Visual) */}
      <Tooltip
        content="Toggle Sidebar"
        position="bottom"
        className="hidden lg:block"
      >
        <button
          onClick={onMenuClick}
          className="p-2.5 hover:bg-accent/50 rounded-full transition-colors text-muted-foreground hover:text-foreground active:scale-95 touch-manipulation"
        >
          <Menu className="w-5 h-5" />
        </button>
      </Tooltip>

      {/* Right Side - Tools & Profile */}
      <div className="flex items-center gap-2 md:gap-4">
        <Tooltip
          content={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          position="bottom"
        >
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2.5 hover:bg-accent/50 rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </Tooltip>

        {/* Notifications */}
        <div className="relative flex items-center" ref={notificationRef}>
          <Tooltip content="Notifications" position="bottom">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 hover:bg-accent/50 rounded-full transition-colors text-muted-foreground hover:text-foreground"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card animate-pulse"></span>
              )}
            </button>
          </Tooltip>

          {showNotifications && (
            <div className="fixed sm:absolute inset-x-4 sm:inset-auto sm:right-0 top-16 sm:top-full mt-2 w-auto sm:w-80 md:w-96 bg-card border border-border/50 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
              <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/30">
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={loading}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No notifications
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className={cn(
                          'p-4 hover:bg-muted/50 transition-colors flex gap-3 items-start group',
                          !notification.read ? 'bg-primary/5' : '',
                        )}
                      >
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full mt-2 shrink-0',
                            !notification.read
                              ? 'bg-primary'
                              : 'bg-transparent',
                          )}
                        />
                        <div className="flex-1 space-y-1">
                          <p
                            className={cn(
                              'text-sm font-medium leading-none',
                              !notification.read
                                ? 'text-foreground'
                                : 'text-muted-foreground',
                            )}
                          >
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification._id)}
                            className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-border/50 mx-2" />

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 p-1 rounded-xl hover:bg-accent/50 transition-all group"
          >
            <div className="hidden sm:flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold leading-none">
                  {capitalize(member.name || 'Member')}
                </span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-muted-foreground transition-transform duration-200',
                    showProfileMenu ? 'rotate-180' : '',
                  )}
                />
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground font-black text-sm group-hover:scale-105 transition-all duration-500 ring-2 ring-primary overflow-hidden">
              {memberInitials}
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border/50 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
              {/* User Info Header */}
              <div className="p-4 border-b border-border/50 bg-muted/30">
                <p className="font-bold text-sm truncate">
                  {capitalize(member.name || 'Member')}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {member.email}
                </p>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-xl font-medium flex items-center gap-3 transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberNavbar;
