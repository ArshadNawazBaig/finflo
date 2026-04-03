import { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid,
  Users,
  BarChart3,
  Settings2,
  LogOut,
  ChevronUp,
  Bell,
  ScrollText,
  DollarSign,
  Database,
  LifeBuoy,
  X,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAtom, useAtomValue } from 'jotai';
import { userAtom, unreadNotificationsCountAtom } from '@/atoms';
import { cn, capitalize } from '@/lib/utils';
import Logo from '@/components/Logo';

const CategoryHeader = ({ label, isExpanded }) => {
  if (!isExpanded) return null;
  return (
    <div className="px-4 pt-2 pb-2.5">
      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">
        {label}
      </span>
    </div>
  );
};

const SuperAdminSidebar = ({ isExpanded, isMobile, onClose }) => {
  const location = useLocation();
  const isActive = (path) =>
    location.pathname === path ||
    (path !== '/super-admin' && location.pathname.startsWith(path + '/'));
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const menuRef = useRef(null);

  const [user, setUser] = useAtom(userAtom);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowLogoutMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    setUser(null);
    window.location.href = '/login';
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'SA';
  const userName = user?.name || 'Super Admin';
  const userRole = 'Super Admin';

  const sidebarClasses = cn(
    'h-screen h-[100dvh] flex flex-col items-center bg-card/95 backdrop-blur-xl border-r border-border/50 fixed top-0 left-0 z-[50] transition-[transform,width,padding] duration-300 ease-in-out z-[101]',
    isMobile
      ? `w-3/5 items-start px-4 transform ${isExpanded ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`
      : isExpanded
        ? 'w-64 items-start'
        : 'w-[70px] items-center',
  );

  const isLayoutExpanded = isMobile ? true : isExpanded;
  const unreadNotificationsCount = useAtomValue(unreadNotificationsCountAtom);

  return (
    <div className={sidebarClasses}>
      {/* Close button for mobile */}
      {isMobile && (
        <button
          onClick={onClose}
          className="absolute top-10 right-4 p-2 rounded-xl bg-accent/50 hover:bg-accent text-foreground transition-colors z-50 shadow-sm"
        >
          <X size={20} />
        </button>
      )}

      <div
        className={cn(
          'w-full transition-all duration-300',
          isMobile ? 'pt-16 pb-6 px-4' : 'border-b border-border/50',
        )}
      >
        <div
          className={cn(
            'flex items-center w-full transition-all duration-300',
            !isMobile && 'h-16',
            isLayoutExpanded ? 'px-1' : 'justify-center px-0',
          )}
        >
          <Link to="/super-admin" className="flex items-center">
            <Logo showText={isLayoutExpanded} />
          </Link>
        </div>
      </div>

      <nav
        className={cn(
          'flex-1 flex flex-col gap-2 w-full scrollbar-hide py-2 transition-all duration-300',
          isLayoutExpanded
            ? 'px-4 overflow-y-auto'
            : 'items-center px-0 overflow-visible',
        )}
      >
        <CategoryHeader label="Overview" isExpanded={isLayoutExpanded} />
        <NavItem
          to="/super-admin"
          icon={<LayoutGrid size={18} />}
          active={isActive('/super-admin')}
          label="Dashboard"
          isExpanded={isLayoutExpanded}
        />
        <NavItem
          to="/super-admin/analytics"
          icon={<BarChart3 size={18} />}
          active={isActive('/super-admin/analytics')}
          label="Analytics"
          isExpanded={isLayoutExpanded}
        />
        <NavItem
          to="/super-admin/revenue"
          icon={<DollarSign size={18} />}
          active={isActive('/super-admin/revenue')}
          label="Revenue"
          isExpanded={isLayoutExpanded}
        />

        <CategoryHeader label="Management" isExpanded={isLayoutExpanded} />
        <NavItem
          to="/super-admin/users"
          icon={<Users size={18} />}
          active={isActive('/super-admin/users')}
          label="Manage Users"
          isExpanded={isLayoutExpanded}
        />
        <NavItem
          to="/super-admin/tickets"
          icon={<LifeBuoy size={18} />}
          active={isActive('/super-admin/tickets')}
          label="Support Tickets"
          isExpanded={isLayoutExpanded}
        />

        <CategoryHeader label="System" isExpanded={isLayoutExpanded} />
        <NavItem
          to="/super-admin/notifications"
          icon={<Bell size={18} />}
          active={isActive('/super-admin/notifications')}
          label="Notifications"
          isExpanded={isLayoutExpanded}
          badge={unreadNotificationsCount > 0 ? unreadNotificationsCount : null}
        />
        <NavItem
          to="/super-admin/activity-logs"
          icon={<ScrollText size={18} />}
          active={isActive('/super-admin/activity-logs')}
          label="Activity Logs"
          isExpanded={isLayoutExpanded}
        />
        <NavItem
          to="/super-admin/backup"
          icon={<Database size={18} />}
          active={isActive('/super-admin/backup')}
          label="Backup"
          isExpanded={isLayoutExpanded}
        />
      </nav>

      <div
        className={cn(
          'mt-auto flex flex-col gap-3 w-full relative',
          isLayoutExpanded ? 'px-4' : 'px-0',
        )}
        ref={menuRef}
      >
        <NavItem
          to="/super-admin/settings"
          icon={<Settings2 size={18} />}
          active={isActive('/super-admin/settings')}
          label="Settings"
          isExpanded={isLayoutExpanded}
        />

        {/* User Profile Section */}
        <div className="relative">
          {/* Logout Menu Popup */}
          {showLogoutMenu && (
            <div
              className={cn(
                'absolute bottom-full left-0 w-full mb-2 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden animate-in fade-in z-10 slide-in-from-bottom-2 duration-200',
                isLayoutExpanded ? 'min-w-[200px]' : 'min-w-[180px] left-10',
              )}
            >
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive font-medium flex items-center gap-2 transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}

          {/* Profile Trigger */}
          <button
            onClick={() => setShowLogoutMenu(!showLogoutMenu)}
            className={cn(
              'w-full flex items-center rounded-2xl p-2 transition-all duration-300 border border-transparent hover:border-border/50 hover:bg-muted/30 group relative overflow-hidden',
              isLayoutExpanded
                ? 'justify-start gap-3 px-3'
                : 'justify-center w-12 h-12 p-0 mx-auto',
              showLogoutMenu ? 'bg-muted/40 border-border/50 shadow-inner' : '',
            )}
          >
            <div className="relative shrink-0">
              <div
                className={`w-10 h-10 rounded-full ${user.profilePicture ? 'bg-primary/10 ring-transparent overflow-hidden' : 'bg-primary ring-primary'} flex items-center justify-center text-primary-foreground font-black shadow-lg shadow-primary/30 ring-2 transition-all duration-500 hover:brightness-110`}
              >
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={userName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  userInitials
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full shadow-sm" />
            </div>

            {isLayoutExpanded && (
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-xs font-black tracking-tight truncate w-full text-left bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {capitalize(userName)}
                </span>
                <span className="text-[9px] font-black tracking-wide text-muted-foreground/60 truncate w-full text-left capitalize">
                  {userRole}
                </span>
              </div>
            )}

            {isLayoutExpanded && (
              <ChevronUp
                size={14}
                className={cn(
                  'ml-auto text-muted-foreground transition-transform duration-300 group-hover:text-primary',
                  showLogoutMenu ? 'rotate-180' : '',
                )}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const NavItem = ({ to, icon, active, label, isExpanded, badge }) => (
  <Link
    to={to}
    className={cn(
      'px-0 py-3 rounded-2xl transition-all duration-500 flex items-center relative group whitespace-nowrap',
      isExpanded ? 'justify-start gap-4 px-4' : 'justify-center w-12 mx-auto',
      active
        ? 'bg-primary text-white shadow-[0_8px_20px_-6px_rgba(var(--primary),0.5)] ring-1 ring-white/20 hover:brightness-110'
        : 'text-muted-foreground hover:bg-primary/10 hover:text-primary',
    )}
  >
    {/* Active Indicator Bar */}
    {active && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
    )}

    <div
      className={cn(
        'relative z-10 shrink-0 transition-transform duration-500 group-hover:scale-110',
        active ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : '',
      )}
    >
      {icon}
    </div>

    <span
      className={cn(
        'transition-all duration-500 origin-left text-[12px] font-bold',
        isExpanded
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 -translate-x-4 w-0 hidden',
        active ? 'text-white' : '',
      )}
    >
      {label}
    </span>

    {badge && (
      <div
        className={cn(
          'absolute bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center min-w-[20px] h-5 px-1 shadow-lg border-2 border-card z-20 transition-all duration-300',
          isExpanded ? 'right-4 top-1/2 -translate-y-1/2' : 'right-0 -top-1',
        )}
      >
        {badge > 99 ? '99+' : badge}
      </div>
    )}

    {/* Custom Tooltip - only show when collapsed */}
    {!isExpanded && (
      <div className="absolute left-full ml-3 px-3 py-2 bg-white dark:bg-slate-800 text-foreground text-xs font-semibold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[100] shadow-lg border border-border/50 pointer-events-none">
        {label}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-white dark:bg-slate-800 rotate-45 border-l border-b border-border/50" />
      </div>
    )}
  </Link>
);

export default SuperAdminSidebar;
