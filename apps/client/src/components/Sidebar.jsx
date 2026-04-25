import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, LogOut, X } from 'lucide-react';

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn, capitalize } from '@/lib/utils';
import Logo from '@/components/Logo';
import usePermissions from '@/hooks/usePermissions';
import { useAtom, useAtomValue } from 'jotai';
import {
  userAtom,
  unreadChatCountAtom,
  pendingMembersCountAtom,
  unreadNotificationsCountAtom,
} from '@/atoms';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip-radix';
import { sidebarMenuConfig } from '@/config/sidebarConfig';

const CategoryHeader = ({ label, isExpanded }) => {
  if (!isExpanded || !label) return null;
  return (
    <div className="px-4 pt-2 pb-2.5">
      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">
        {label}
      </span>
    </div>
  );
};

const Sidebar = ({ isExpanded, isMobile, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useAtom(userAtom);
  const { hasPermission, hasAnyPermission } = usePermissions();

  const unreadChatCount = useAtomValue(unreadChatCountAtom);
  const pendingMembersCount = useAtomValue(pendingMembersCountAtom);
  const unreadNotificationsCount = useAtomValue(unreadNotificationsCountAtom);

  const isActive = (path) =>
    location.pathname === path ||
    (path !== '/dashboard' && location.pathname.startsWith(path + '/'));

  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const menuRef = useRef(null);
  const navRef = useRef(null);
  const [canScroll, setCanScroll] = useState(false);

  const checkScroll = () => {
    if (navRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = navRef.current;
      setCanScroll(scrollTop + clientHeight < scrollHeight - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const nav = navRef.current;
    if (nav) {
      nav.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        nav.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(checkScroll, 500);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  const scrollToBottom = () => {
    if (navRef.current) {
      navRef.current.scrollTo({
        top: navRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowLogoutMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'JS';
  const userName = user?.name || 'User';
  const userRole = user?.isManager ? 'Branch Manager' : user?.role || 'User';

  const isLayoutExpanded = isMobile ? true : isExpanded;

  const sidebarClasses = cn(
    'h-screen h-[100dvh] flex flex-col items-center bg-card/95 backdrop-blur-xl border-r border-border/50 fixed top-0 left-0 z-[101] transition-[transform,width,padding] duration-300 ease-in-out',
    isMobile
      ? `w-full items-start transform ${isExpanded ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`
      : isExpanded
        ? 'w-64 items-start'
        : 'w-[70px] items-center',
  );

  const atoms = {
    unreadChatCount,
    pendingMembersCount,
    unreadNotificationsCount,
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className={sidebarClasses}>
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
              isLayoutExpanded ? 'px-5' : 'justify-center px-0',
            )}
          >
            <Link to="/dashboard" className="flex items-center">
              <Logo showText={isLayoutExpanded} custom />
            </Link>
          </div>
        </div>

        <nav
          ref={navRef}
          className={cn(
            'flex-1 flex flex-col gap-2 w-full py-2 transition-all duration-300 overflow-y-auto no-scrollbar scrollbar-none',
            isLayoutExpanded ? 'px-4' : 'items-center px-0 overflow-x-hidden',
          )}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {sidebarMenuConfig.map((category, catIdx) => {
            if (category.condition && !category.condition(user)) return null;

            return (
              <div key={catIdx} className="w-full">
                <CategoryHeader
                  label={category.category}
                  isExpanded={isLayoutExpanded}
                />
                {category.items.map((item, itemIdx) => {
                  if (item.condition && !item.condition(user)) return null;
                  if (
                    item.permissions &&
                    !item.any &&
                    !hasPermission(item.permissions[0])
                  )
                    return null;
                  if (
                    item.permissions &&
                    item.any &&
                    !hasAnyPermission(item.permissions)
                  )
                    return null;

                  const to =
                    typeof item.to === 'function' ? item.to(user) : item.to;
                  const label =
                    typeof item.label === 'function'
                      ? item.label(user)
                      : item.label;
                  const badge = item.getBadge ? item.getBadge(atoms) : null;

                  return (
                    <NavItem
                      key={itemIdx}
                      to={to}
                      icon={<item.icon size={18} />}
                      active={isActive(to)}
                      onboardingId={item.onboardingId}
                      label={label}
                      isExpanded={isLayoutExpanded}
                      badge={badge > 0 ? badge : null}
                    />
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div
          className={cn(
            'mt-auto flex flex-col gap-3 w-full relative pt-4 border-t border-border/50',
            isLayoutExpanded ? 'px-4' : 'px-0',
          )}
          ref={menuRef}
        >
          {canScroll && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={scrollToBottom}
                  className={cn(
                    'w-full flex items-center transition-all duration-500 relative group mb-1 rounded-2xl py-3 justify-center',
                    isLayoutExpanded ? 'gap-4 px-4' : 'w-12 mx-auto',
                    'bg-primary/10 text-primary hover:bg-primary hover:text-white shadow-lg shadow-primary/5 hover:shadow-primary/20',
                  )}
                >
                  <ChevronDown size={18} className="animate-bounce" />
                  {isLayoutExpanded && (
                    <span className="text-[12px] font-bold">See more</span>
                  )}
                </button>
              </TooltipTrigger>
              {!isLayoutExpanded && (
                <TooltipContent side="right" sideOffset={12}>
                  See more
                </TooltipContent>
              )}
            </Tooltip>
          )}

          <div className="relative">
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
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            )}

            <button
              onClick={() => setShowLogoutMenu(!showLogoutMenu)}
              className={cn(
                'w-full flex items-center rounded-2xl p-2 transition-all duration-300 border border-transparent hover:border-border/50 hover:bg-muted/30 group relative overflow-hidden',
                isLayoutExpanded
                  ? 'justify-start gap-3 px-3'
                  : 'justify-center w-12 h-12 p-0 mx-auto',
                showLogoutMenu
                  ? 'bg-muted/40 border-border/50 shadow-inner'
                  : '',
              )}
            >
              <div className="relative shrink-0">
                <div
                  className={`w-10 h-10 rounded-full ${user?.profilePicture ? 'bg-primary/10' : 'bg-primary'} flex items-center justify-center text-primary-foreground font-black shadow-lg shadow-primary/30 ring-2 ring-primary transition-all duration-500 hover:brightness-110 overflow-hidden`}
                >
                  {user?.profilePicture ? (
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
    </TooltipProvider>
  );
};

const NavItem = ({
  to,
  icon,
  active,
  label,
  isExpanded,
  badge,
  onboardingId,
}) => {
  const content = (
    <Link
      to={to}
      data-onboarding-id={onboardingId}
      className={cn(
        'px-0 py-3 rounded-2xl transition-all duration-500 flex items-center relative group whitespace-nowrap',
        isExpanded ? 'justify-start gap-4 px-4' : 'justify-center w-12 mx-auto',
        active
          ? 'bg-primary text-white shadow-[0_8px_20px_-6px_rgba(var(--primary),0.5)] ring-1 ring-white/20 hover:brightness-110'
          : 'text-muted-foreground hover:bg-primary/10 hover:text-primary',
      )}
    >
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

export default Sidebar;
