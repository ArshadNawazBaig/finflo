/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState } from 'react';
import {
  Bell,
  AlignLeft,
  Sun,
  Moon,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { getLandingUrl, IS_APP_DOMAIN, IS_DEV } from '@/lib/constants';
import { toast } from 'sonner';
import {
  cn,
  capitalize,
  getInitials,
  getSafeNotificationLink,
  formatNotificationTime,
} from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';
import GlobalSearch from '@/components/GlobalSearch';
import { useLogout } from '@/hooks/useLogout';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useAtom, useAtomValue } from 'jotai';
import {
  notificationsAtom,
  unreadNotificationsCountAtom,
  userAtom,
} from '@/atoms';

/**
 * A single notification row. Extracted to module level — previously this
 * component was redefined inside the render `.map()`, which gave React a new
 * component identity every render and remounted the whole list.
 */
const NotificationItem = ({ notification, role, onMarkRead, onClose }) => {
  const safeLink = notification.link
    ? getSafeNotificationLink(notification.link, role)
    : null;

  const activate = (close) => {
    if (!notification.read) onMarkRead(notification._id);
    if (close) onClose?.();
  };

  const inner = (
    <>
      {!notification.read && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
      )}
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex justify-between items-start gap-4">
          <p
            className={cn(
              'text-sm font-black tracking-tight leading-none truncate',
              !notification.read ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMarkRead(notification._id);
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
          {formatNotificationTime(notification.createdAt)}
        </p>
      </div>
    </>
  );

  if (safeLink) {
    return (
      <Link
        to={safeLink}
        onClick={() => activate(true)}
        className={cn(
          'p-5 transition-all duration-300 flex gap-4 items-start group relative hover:bg-muted/50',
          !notification.read ? 'bg-primary/[0.03]' : '',
        )}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      onClick={() => activate(false)}
      className={cn(
        'p-5 transition-all duration-300 flex gap-4 items-start group relative',
        !notification.read ? 'bg-primary/[0.03]' : '',
      )}
    >
      {inner}
    </div>
  );
};

/**
 * The notifications dropdown panel: header (+ clear-all), the scrollable list
 * of {@link NotificationItem}s, and the "View All History" footer.
 */
const NotificationPanel = ({
  notifications,
  unreadCount,
  loading,
  role,
  onMarkRead,
  onMarkAllRead,
  onClose,
}) => (
  <div className="fixed sm:absolute inset-x-4 sm:inset-auto sm:right-0 top-16 sm:top-full mt-3 w-auto sm:w-[400px] bg-card border border-border/40 rounded-lg shadow-2xl shadow-primary/10 overflow-hidden animate-in fade-in zoom-in-95 duration-300 z-50">
    <div className="px-6 py-5 border-b border-border/10 flex items-center justify-between bg-muted/20">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        Notifications
      </h3>
      {unreadCount > 0 && (
        <button
          onClick={onMarkAllRead}
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
            <NotificationItem
              key={notification._id}
              notification={notification}
              role={role}
              onMarkRead={onMarkRead}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
    <Link
      to={role === 'super_admin' ? '/super-admin/notifications' : '/notifications'}
      className="p-5 bg-muted/10 border-t border-border/10 text-center text-[10px] font-black uppercase tracking-[0.3em] text-primary hover:bg-primary/5 transition-all block"
      onClick={onClose}
    >
      View All History
    </Link>
  </div>
);

/**
 * Profile button + dropdown menu. The container ref (from useClickOutside) is
 * passed in so the parent can close the menu on an outside click.
 */
const ProfileDropdown = ({
  user,
  userInitials,
  userStatus,
  open,
  onToggle,
  containerRef,
  onNavigateSettings,
  onLogout,
}) => (
  <div className="relative" ref={containerRef}>
    <button
      onClick={onToggle}
      className="flex items-center gap-3 py-1 pl-3 pr-2 rounded-xl hover:bg-accent/50 transition-all group"
    >
      <div className="hidden sm:flex flex-col items-end gap-1">
        {user.role === 'super_admin' && (
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 dark:text-muted-foreground/60">
            Super Admin
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold leading-none">
            {capitalize(user.name || 'User')}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform duration-200',
              open ? 'rotate-180' : '',
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
              referrerPolicy="no-referrer"
            />
          ) : (
            userInitials
          )}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full shadow-sm" />
      </div>
    </button>

    {open && (
      <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border/50 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
        {/* User Info Header */}
        <div className="p-4 border-b border-border/50 bg-muted/30">
          <p className="font-bold text-sm truncate">
            {capitalize(user.name || 'User')}
          </p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
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

        {/* Menu Options — single Account Settings entry (the former duplicate
            "My Profile"/"Account Settings" both navigated to /settings). */}
        <div className="p-2">
          <button
            onClick={onNavigateSettings}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
          >
            <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
            Account Settings
          </button>
        </div>

        {/* Logout */}
        <div className="p-2 border-t border-border/50 bg-muted/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-sm font-bold text-red-500 transition-colors group"
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            Logout
          </button>
        </div>
      </div>
    )}
  </div>
);

const Navbar = ({ onMenuClick, isVisible = true }) => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const logout = useLogout();

  const [notifications, setNotifications] = useAtom(notificationsAtom);
  const [unreadCount, setUnreadCount] = useAtom(unreadNotificationsCountAtom);
  const user = useAtomValue(userAtom);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const notificationRef = useClickOutside(
    () => setShowNotifications(false),
    showNotifications,
  );
  const profileRef = useClickOutside(
    () => setShowProfileMenu(false),
    showProfileMenu,
  );

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
      // Decrement the global unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await api.put('/notifications/all/read');
      // Update global atom locally for instant UI feedback
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    } finally {
      setLoading(false);
    }
  };

  const goToSettings = () => {
    navigate(user.role === 'super_admin' ? '/super-admin/settings' : '/settings');
    setShowProfileMenu(false);
  };

  const userInitials = getInitials(user?.name);
  const userStatus = user?.status || 'Active';

  return (
    <header className="sticky top-0 z-40 w-full lg:border-b lg:border-border/50 lg:bg-card/50 lg:backdrop-blur-sm">
      <div className="w-full lg:px-8 lg:h-[72px] flex items-center">
        <div
          className={cn(
            'flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.3,1,0.2,1)] w-full',
            // Mobile: Floating Pill
            'fixed top-12 left-1/2 -translate-x-1/2 w-[92%] max-w-sm mx-auto bg-background/95 border border-border/40 rounded-full py-1.5 px-3 z-[100] lg:relative lg:top-0 lg:left-0 lg:translate-x-0 lg:w-full lg:max-w-none lg:bg-transparent lg:border-0 lg:shadow-none lg:px-0 lg:py-0',
            !isVisible &&
              'max-lg:-translate-y-[150%] max-lg:opacity-0 max-lg:pointer-events-none',
          )}
        >
          {/* Left Side - Menu & Search (Desktop) */}
          <div className="flex items-center gap-2 md:gap-4 flex-1 max-w-2xl">
            <Tooltip content="Toggle Sidebar" position="bottom">
              <button
                onClick={onMenuClick}
                className="p-2 hover:bg-accent/40 rounded-full transition-colors text-muted-foreground hover:text-foreground active:scale-95 touch-manipulation shrink-0"
              >
                <AlignLeft className="w-5 h-5" />
              </button>
            </Tooltip>

            {/* Back to Corporate Landing — visible only on app.finflo.org */}
            {(IS_APP_DOMAIN || IS_DEV) && (
              <a
                href={IS_DEV ? '/' : getLandingUrl('/')}
                className="hidden lg:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors group shrink-0"
              >
                <span className="group-hover:-translate-x-0.5 transition-transform">
                  ←
                </span>
                Corporate Landing
              </a>
            )}

            <div className="flex-1 max-w-md hidden md:block">
              <GlobalSearch />
            </div>

            {/* Mobile Search - integrated in floating bar */}
            <div className="md:hidden flex-1">
              <GlobalSearch isCompact />
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
                className="p-2 hover:bg-accent/40 rounded-full transition-colors text-muted-foreground hover:text-foreground"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </Tooltip>

            {/* Notifications */}
            <div className="flex items-center" ref={notificationRef}>
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
                <NotificationPanel
                  notifications={notifications}
                  unreadCount={unreadCount}
                  loading={loading}
                  role={user?.role}
                  onMarkRead={markAsRead}
                  onMarkAllRead={markAllAsRead}
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>

            <div className="h-6 w-px bg-border/50 mx-2" />

            {/* Profile Dropdown */}
            <ProfileDropdown
              user={user}
              userInitials={userInitials}
              userStatus={userStatus}
              open={showProfileMenu}
              onToggle={() => setShowProfileMenu(!showProfileMenu)}
              containerRef={profileRef}
              onNavigateSettings={goToSettings}
              onLogout={() => logout()}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
