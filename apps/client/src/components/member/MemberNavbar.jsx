import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  AlignLeft,
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
      const memberToken = localStorage.getItem('member');
      const { data } = await api.get('/member-notifications', {
        headers: { /* Auth header handled by browser cookies */ },
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
      const memberToken = localStorage.getItem('member');
      await api.put(
        `/member-notifications/${id}/read`,
        {},
        {
          headers: { /* Auth header handled by browser cookies */ },
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
      const memberToken = localStorage.getItem('member');
      await api.put(
        '/member-notifications/all/read',
        {},
        {
          headers: { /* Auth header handled by browser cookies */ },
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
    localStorage.removeItem('member');
    localStorage.removeItem('member');
    toast.success('Logged out successfully');
    navigate('/member/login');
  };

  const [member, setMember] = useState(() =>
    JSON.parse(localStorage.getItem('member') || '{}'),
  );

  useEffect(() => {
    const handleMemberUpdate = () => {
      setMember(JSON.parse(localStorage.getItem('member') || '{}'));
    };
    window.addEventListener('memberUpdated', handleMemberUpdate);
    return () =>
      window.removeEventListener('memberUpdated', handleMemberUpdate);
  }, []);

  const memberInitials = member.name
    ? member.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'M';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="h-16 px-4 md:px-8 flex items-center justify-between">
        {/* Left Side - Menu & Search */}
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
              <AlignLeft className="w-5 h-5" />
            </button>
          </Tooltip>

          <div className="flex-1 max-w-md hidden md:block">
            <GlobalSearch isMember={true} />
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
              <div className="fixed sm:absolute inset-x-4 sm:inset-auto sm:right-0 top-16 sm:top-full mt-3 w-auto sm:w-[400px] bg-card border border-border/40 rounded-lg shadow-2xl shadow-primary/10 overflow-hidden animate-in fade-in zoom-in-95 duration-300 z-50">
                <div className="px-6 py-5 border-b border-border/10 flex items-center justify-between bg-muted/20">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      disabled={loading}
                      className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center">
                        <Bell className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                        No new alerts
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/5">
                      {notifications.map((notification) => (
                        <div
                          key={notification._id}
                          onClick={() => {
                            if (notification.link) {
                              const safeLink = getSafeNotificationLink(
                                notification.link,
                                member.role || 'member',
                              );
                              if (safeLink) {
                                navigate(safeLink);
                                setShowNotifications(false);
                              }
                            }
                          }}
                          className={cn(
                            'p-5 transition-all duration-300 flex gap-4 items-start group relative',
                            !notification.read ? 'bg-primary/[0.03]' : '',
                            notification.link ? 'cursor-pointer' : '',
                          )}
                        >
                          {!notification.read && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                          )}
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <div className="flex justify-between items-start gap-4">
                              <p
                                className={cn(
                                  'text-sm font-black tracking-tight leading-none truncate',
                                  !notification.read
                                    ? 'text-foreground'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification._id);
                                  }}
                                  className="text-[10px] text-primary font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                            <p
                              className={cn(
                                'text-xs leading-relaxed font-medium line-clamp-2',
                                !notification.read
                                  ? 'text-foreground/70'
                                  : 'text-muted-foreground/60',
                              )}
                            >
                              {notification.message}
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 pt-1">
                              {new Date(
                                notification.createdAt,
                              ).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              •{' '}
                              {new Date(
                                notification.createdAt,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Link
                  to="/member/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="p-5 bg-muted/10 border-t border-border/10 text-center text-[10px] font-black uppercase tracking-[0.3em] text-primary hover:bg-primary/5 transition-all block"
                >
                  View All History
                </Link>
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
              <div
                className={`w-9 h-9 rounded-full ${member.profilePicture ? 'bg-primary/10' : 'bg-primary'} shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground font-black text-sm group-hover:scale-105 transition-all duration-500 ring-2 ring-primary overflow-hidden`}
              >
                {member.profilePicture ? (
                  <img
                    src={member.profilePicture}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  memberInitials
                )}
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
                  <Link
                    to="/member/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 rounded-xl font-medium flex items-center gap-3 transition-colors"
                  >
                    <Settings size={16} />
                    Settings
                  </Link>
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

      {/* Mobile Search Row */}
      <div className="md:hidden px-4 pb-3 pt-1 border-t border-border/10">
        <GlobalSearch isMember={true} />
      </div>
    </header>
  );
};

export default MemberNavbar;
