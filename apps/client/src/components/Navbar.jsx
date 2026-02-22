import { useState, useEffect, useRef } from 'react';
import {
  Filter,
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
import { cn, capitalize, getSafeNotificationLink } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';
import GlobalSearch from '@/components/GlobalSearch';

const Navbar = ({ onMenuClick }) => {
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
      const { data } = await api.get('/notifications');
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
      await api.put(`/notifications/${id}/read`);
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
      await api.put('/notifications/all/read');
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem('user') || '{}'),
  );

  useEffect(() => {
    const handleUserUpdate = () => {
      setUser(JSON.parse(localStorage.getItem('user') || '{}'));
    };

    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, []);

  const userInitials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'JS';
  const userStatus = user.status || 'Active';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="h-16 px-4 md:px-8 flex items-center justify-between">
        {/* Left Side - Menu & Search (Desktop) */}
        <div className="flex items-center gap-2 md:gap-4 flex-1 max-w-2xl">
          <Tooltip
            content="Toggle Sidebar"
            position="bottom"
            className="hidden lg:block"
          >
            <button
              onClick={onMenuClick}
              className="p-2.5 hover:bg-accent/50 rounded-full transition-colors text-muted-foreground hover:text-foreground active:scale-95 touch-manipulation shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
          </Tooltip>

          <div className="flex-1 max-w-md hidden md:block">
            <GlobalSearch />
          </div>
        </div>

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

          {/* <button className="p-2.5 hover:bg-accent/50 rounded-full transition-colors text-muted-foreground hover:text-foreground hidden sm:block">
          <Filter className="w-5 h-5" />
        </button> */}

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
                <div className="bg-primary/5 p-2 text-center border-b border-border/50">
                  <Link
                    to="/notifications"
                    className="text-xs font-bold text-primary hover:underline"
                    onClick={() => setShowNotifications(false)}
                  >
                    View all notifications
                  </Link>
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
                          onClick={() => {
                            if (notification.link) {
                              const safeLink = getSafeNotificationLink(
                                notification.link,
                                user.role,
                              );
                              if (safeLink) {
                                navigate(safeLink);
                                setShowNotifications(false);
                              }
                            }
                          }}
                          className={cn(
                            'p-4 hover:bg-muted/50 transition-colors flex gap-3 items-start group',
                            !notification.read ? 'bg-primary/5' : '',
                            notification.link ? 'cursor-pointer' : '',
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
                              {new Date(
                                notification.createdAt,
                              ).toLocaleString()}
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
                {user.role === 'Super Admin' && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 dark:text-muted-foreground/60">
                    Super Admin
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold leading-none">
                    {capitalize(user.name)}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-muted-foreground transition-transform duration-200',
                      showProfileMenu ? 'rotate-180' : '',
                    )}
                  />
                </div>
              </div>
              <div className="relative">
                <div
                  className={`w-9 h-9 rounded-full ${user.profilePicture ? 'bg-primary/10' : 'bg-primary'} shadow-lg shadow-primary/30 flex items-center justify-center text-primary-foreground font-black text-sm group-hover:scale-110 transition-all duration-500 ring-2 ring-primary hover:brightness-110 overflow-hidden`}
                >
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    userInitials
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full shadow-sm" />
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border/50 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                {/* User Info Header */}
                <div className="p-4 border-b border-border/50 bg-muted/30">
                  <p className="font-bold text-sm truncate">
                    {capitalize(user.name)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                  <div className="mt-2">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border',
                        userStatus === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-500 border-red-500/20',
                      )}
                    >
                      {userStatus}
                    </span>
                  </div>
                </div>

                {/* Menu Options */}
                <div className="p-2">
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
                  >
                    <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
                  >
                    <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                    Account Settings
                  </button>
                </div>

                {/* Logout */}
                <div className="p-2 border-t border-border/50 bg-muted/10">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-sm font-bold text-red-500 transition-colors group"
                  >
                    <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Row */}
      <div className="md:hidden px-4 pb-3 pt-1 border-t border-border/10">
        <GlobalSearch />
      </div>
    </header>
  );
};

export default Navbar;
