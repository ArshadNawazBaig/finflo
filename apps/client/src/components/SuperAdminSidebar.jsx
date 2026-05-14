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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip-radix';

const CategoryHeader = ({ label, isExpanded }) => {
  if (!isExpanded || !label) return null;
  return (
    <div className="px-4 pt-3 pb-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
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
    'h-screen h-[100dvh] flex flex-col items-center bg-white dark:bg-slate-950 backdrop-blur-xl border-r border-slate-100 dark:border-white/[0.06] fixed top-0 left-0 z-[101] transition-[transform,width,padding] duration-300 ease-in-out',
    isMobile
      ? `w-full items-start transform ${isExpanded ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`
      : isExpanded
        ? 'w-64 items-start'
        : 'w-[70px] items-center',
  );

  const isLayoutExpanded = isMobile ? true : isExpanded;
  const unreadNotificationsCount = useAtomValue(unreadNotificationsCountAtom);

  return (
    <TooltipProvider delayDuration={0}>
      <div className={sidebarClasses}>
        {isMobile && (
          <button
            onClick={onClose}
            className="absolute top-10 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 transition-colors z-50"
          >
            <X size={18} />
          </button>
        )}

        <div
          className={cn(
            'w-full transition-all duration-300',
            isMobile
              ? 'pt-16 pb-6 px-4'
              : 'border-b border-slate-100 dark:border-white/[0.06]',
          )}
        >
          <div
            className={cn(
              'flex items-center w-full transition-all duration-300',
              !isMobile && 'h-[72px]',
              isLayoutExpanded ? 'px-5' : 'justify-center px-0',
            )}
          >
            <Link
              to="/super-admin"
              className={cn(
                'flex items-center rounded-2xl transition-colors',
                isLayoutExpanded
                  ? 'gap-2 px-1 py-1 -ml-1 hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                  : 'p-1.5',
              )}
            >
              <Logo showText={isLayoutExpanded} custom />
            </Link>
          </div>
        </div>

        <nav
          className={cn(
            'flex-1 flex flex-col gap-1 w-full py-3 transition-all duration-300 overflow-y-auto no-scrollbar scrollbar-none',
            isLayoutExpanded ? 'px-3' : 'items-center px-0 overflow-x-hidden',
          )}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
            badge={
              unreadNotificationsCount > 0 ? unreadNotificationsCount : null
            }
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
            'mt-auto flex flex-col gap-2 w-full relative pt-3 pb-3 border-t border-slate-100 dark:border-white/[0.06]',
            isLayoutExpanded ? 'px-3' : 'px-0',
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

          <div className="relative">
            {showLogoutMenu && (
              <div
                className={cn(
                  'absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/[0.06] rounded-2xl shadow-[0_20px_50px_-15px_rgba(15,23,42,0.25)] overflow-hidden animate-in fade-in z-10 slide-in-from-bottom-2 duration-200',
                  isLayoutExpanded ? 'min-w-[200px]' : 'min-w-[180px] left-10',
                )}
              >
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-[13px] text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 font-bold flex items-center gap-2.5 transition-colors"
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            )}

            <button
              onClick={() => setShowLogoutMenu(!showLogoutMenu)}
              className={cn(
                'w-full flex items-center rounded-2xl transition-all duration-300 border border-transparent group relative overflow-hidden',
                isLayoutExpanded
                  ? 'justify-start gap-3 px-2.5 py-2 hover:border-slate-100 dark:hover:border-white/[0.06] hover:bg-slate-50/60 dark:hover:bg-white/[0.03]'
                  : 'justify-center w-11 h-11 p-0 mx-auto',
                showLogoutMenu && isLayoutExpanded
                  ? 'bg-slate-50/80 dark:bg-white/[0.03] border-slate-100 dark:border-white/[0.06]'
                  : '',
              )}
            >
              <div className="relative shrink-0">
                <div
                  className={`w-9 h-9 rounded-full ${user?.profilePicture ? 'bg-primary/10' : 'bg-primary'} flex items-center justify-center text-white text-[12px] font-extrabold tracking-tight shadow-[0_6px_16px_-6px_rgba(99,102,241,0.5)] transition-all duration-300 hover:brightness-110 overflow-hidden`}
                >
                  {user?.profilePicture ? (
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
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" />
              </div>

              {isLayoutExpanded && (
                <div className="flex flex-col items-start overflow-hidden min-w-0">
                  <span className="text-[13px] font-extrabold tracking-tight truncate w-full text-left text-slate-900 dark:text-white">
                    {capitalize(userName)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 truncate w-full text-left">
                    {userRole}
                  </span>
                </div>
              )}

              {isLayoutExpanded && (
                <ChevronUp
                  size={14}
                  className={cn(
                    'ml-auto text-slate-400 dark:text-slate-500 transition-transform duration-300 group-hover:text-primary',
                    showLogoutMenu ? 'rotate-180' : '',
                  )}
                />
              )}
            </button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

const NavItem = ({ to, icon, active, label, isExpanded, badge }) => {
  const content = (
    <Link
      to={to}
      className={cn(
        'py-2.5 rounded-2xl transition-all duration-300 flex items-center relative group whitespace-nowrap',
        isExpanded
          ? 'justify-start gap-3 px-3'
          : 'justify-center w-11 h-11 mx-auto',
        active
          ? 'bg-primary text-white hover:brightness-[1.05]'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white',
      )}
    >
      <div
        className={cn(
          'relative z-10 shrink-0 transition-transform duration-300 group-hover:scale-105',
          active ? 'scale-105' : '',
        )}
      >
        {icon}
      </div>
      <span
        className={cn(
          'transition-all duration-300 origin-left text-[12px] font-semibold',
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
            'absolute bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center min-w-[18px] h-[18px] px-1 ring-2 ring-white dark:ring-slate-950 z-20 transition-all duration-300 tabular-nums',
            isExpanded
              ? 'right-3 top-1/2 -translate-y-1/2'
              : 'right-0 -top-0.5',
          )}
        >
          {badge > 99 ? '99+' : badge}
        </div>
      )}
    </Link>
  );

  if (isExpanded) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
};

export default SuperAdminSidebar;
