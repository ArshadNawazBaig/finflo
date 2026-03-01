import { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid,
  UsersRound,
  WalletMinimal,
  Settings2,
  LogOut,
  FileChartColumn,
  FileQuestion,
  ArrowRightLeft,
  ChevronUp,
  Landmark,
  Gem,
  CreditCard,
  LifeBuoy,
  Bell,
  X,
  Users,
  Archive,
  ShieldCheck,
  FileCheck2,
  ChevronDown,
  Percent,
  BookOpen,
  Shield,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn, capitalize } from '@/lib/utils';
import Logo from '@/components/Logo';
import usePermissions from '@/hooks/usePermissions';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip-radix';

const CategoryHeader = ({ label, isExpanded }) => {
  if (!isExpanded) return null;
  return (
    <div className="px-4 pt-4 pb-2">
      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">
        {label}
      </span>
    </div>
  );
};

const Sidebar = ({ isExpanded, isMobile, onClose }) => {
  const location = useLocation();
  const isActive = (path) =>
    location.pathname === path ||
    (path !== '/dashboard' && location.pathname.startsWith(path + '/'));
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const menuRef = useRef(null);
  const navRef = useRef(null);
  const scrollInterval = useRef(null);
  const [canScroll, setCanScroll] = useState(false);

  // Check if content is scrollable
  const checkScroll = () => {
    if (navRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = navRef.current;
      setCanScroll(scrollTop + clientHeight < scrollHeight - 10); // 10px buffer
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

  // Update scroll status when items might change (e.g. role-based items)
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
    localStorage.removeItem('user');
    localStorage.removeItem('user');
    window.location.href = '/login';
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

  const { hasPermission, hasAnyPermission } = usePermissions();

  const userInitials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'JS';
  const userName = user.name || 'John Smith';
  const userRole = user.isManager ? 'Branch Manager' : user.role || 'User';

  const sidebarClasses = cn(
    'h-screen h-[100dvh] flex flex-col items-center py-4 bg-card/95 backdrop-blur-xl border-r border-border/50 fixed top-0 left-0 z-[50] transition-[transform,width,padding] duration-300 ease-in-out z-[101]',
    // Mobile specific classes
    isMobile
      ? `w-3/5 items-start px-4 transform ${isExpanded ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`
      : // Desktop specific classes
        isExpanded
        ? 'w-64 items-start px-4'
        : 'w-[70px] items-center px-2',
  );

  // For mobile, we always want the "expanded" internal layout when visible
  // For desktop, it follows the actual isExpanded state
  const isLayoutExpanded = isMobile ? true : isExpanded;

  return (
    <TooltipProvider delayDuration={0}>
      <div className={sidebarClasses}>
        {/* Close button for mobile */}
        {isMobile && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-accent/50 hover:bg-accent text-foreground transition-colors z-50 shadow-sm"
          >
            <X size={20} />
          </button>
        )}

        <div
          className={cn('mb-8 transition-all', isLayoutExpanded ? 'px-2' : '')}
        >
          <Link to="/dashboard">
            <Logo showText={isLayoutExpanded} custom />
          </Link>
        </div>

        <nav
          ref={navRef}
          className={cn(
            'flex-1 flex flex-col gap-2 w-full py-2 transition-all duration-300 overflow-y-auto relative no-scrollbar scrollbar-none',
            isLayoutExpanded ? 'px-4' : 'items-center px-0 overflow-x-hidden',
          )}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <CategoryHeader label="Overview" isExpanded={isLayoutExpanded} />
          <NavItem
            to="/dashboard"
            icon={<LayoutGrid size={18} />}
            active={isActive('/dashboard')}
            label="Dashboard"
            isExpanded={isLayoutExpanded}
          />

          <CategoryHeader label="Users" isExpanded={isLayoutExpanded} />
          {hasAnyPermission(['view_all', 'manage_members']) && (
            <NavItem
              to="/customers"
              icon={<UsersRound size={18} />}
              active={isActive('/customers')}
              label="Customers"
              isExpanded={isLayoutExpanded}
            />
          )}
          {hasAnyPermission(['view_all', 'manage_members']) && (
            <NavItem
              to="/members"
              icon={<Landmark size={18} />}
              active={isActive('/members')}
              label="Members"
              isExpanded={isLayoutExpanded}
            />
          )}
          {hasPermission('approve_members') && (
            <NavItem
              to="/verification-queue"
              icon={<FileCheck2 size={18} />}
              active={isActive('/verification-queue')}
              label="Verify Docs"
              isExpanded={isLayoutExpanded}
            />
          )}
          {hasPermission('manage_roles') && (
            <NavItem
              to="/team"
              icon={<Users size={18} />}
              active={isActive('/team')}
              label="Team"
              isExpanded={isLayoutExpanded}
            />
          )}

          <CategoryHeader label="Lending" isExpanded={isLayoutExpanded} />
          {hasPermission('manage_loans') && (
            <NavItem
              to="/loan-requests"
              icon={<FileQuestion size={18} />}
              active={isActive('/loan-requests')}
              label="Requests"
              isExpanded={isLayoutExpanded}
            />
          )}
          {hasAnyPermission(['view_all', 'manage_loans']) && (
            <NavItem
              to="/loans"
              icon={<WalletMinimal size={18} />}
              active={isActive('/loans')}
              label="Loans"
              isExpanded={isLayoutExpanded}
            />
          )}
          {hasAnyPermission(['manage_loans', 'system_settings']) && (
            <NavItem
              to="/loan-products"
              icon={<BookOpen size={18} />}
              active={isActive('/loan-products')}
              label="Product Catalog"
              isExpanded={isLayoutExpanded}
            />
          )}

          <CategoryHeader label="Finance" isExpanded={isLayoutExpanded} />
          {hasAnyPermission(['view_all', 'view_reports', 'manage_loans']) && (
            <NavItem
              to="/transactions"
              icon={<ArrowRightLeft size={18} />}
              active={isActive('/transactions')}
              label="Transactions"
              isExpanded={isLayoutExpanded}
            />
          )}
          {hasAnyPermission(['manage_members', 'view_reports']) && (
            <NavItem
              to="/distributions"
              icon={<Percent size={18} />}
              active={isActive('/distributions')}
              label="Distributions"
              isExpanded={isLayoutExpanded}
            />
          )}

          <CategoryHeader label="Admin" isExpanded={isLayoutExpanded} />
          {hasPermission('view_reports') && (
            <NavItem
              to="/reports"
              icon={<FileChartColumn size={18} />}
              active={isActive('/reports')}
              label="Reports"
              isExpanded={isLayoutExpanded}
            />
          )}
          {hasPermission('manage_branches') && (
            <NavItem
              to={user.isManager ? `/branches/${user.branchId}` : '/branches'}
              icon={<ShieldCheck size={18} />}
              active={
                user.isManager
                  ? isActive(`/branches/${user.branchId}`)
                  : isActive('/branches')
              }
              label={user.isManager ? 'My Branch' : 'Branches'}
              isExpanded={isLayoutExpanded}
            />
          )}
          {hasAnyPermission(['view_reports', 'manage_roles']) && (
            <NavItem
              to="/audit-logs"
              icon={<Archive size={18} />}
              active={isActive('/audit-logs')}
              label="Audit Trail"
              isExpanded={isLayoutExpanded}
            />
          )}
          {hasPermission('manage_roles') && (
            <NavItem
              to="/roles"
              icon={<Shield size={18} />}
              active={isActive('/roles')}
              label="Roles"
              isExpanded={isLayoutExpanded}
            />
          )}

          <CategoryHeader label="System" isExpanded={isLayoutExpanded} />
          <NavItem
            to="/notifications"
            icon={<Bell size={18} />}
            active={isActive('/notifications')}
            label="Notifications"
            isExpanded={isLayoutExpanded}
          />
          {hasPermission('system_settings') && (
            <>
              {user.role === 'admin' && (
                <>
                  <NavItem
                    to="/pricing"
                    icon={<Gem size={18} />}
                    active={isActive('/pricing')}
                    label="Pricing"
                    isExpanded={isLayoutExpanded}
                  />
                  <NavItem
                    to="/billing"
                    icon={<CreditCard size={18} />}
                    active={isActive('/billing')}
                    label="Billing"
                    isExpanded={isLayoutExpanded}
                  />
                </>
              )}
            </>
          )}

          {user.plan && user.plan !== 'Free' && (
            <>
              <CategoryHeader label="Help" isExpanded={isLayoutExpanded} />
              <NavItem
                to="/support"
                icon={<LifeBuoy size={18} />}
                active={isActive('/support')}
                label="Support"
                isExpanded={isLayoutExpanded}
              />
            </>
          )}
        </nav>

        <div
          className={cn(
            'mt-auto flex flex-col gap-3 w-full relative pt-4 border-t border-border/50',
            isLayoutExpanded ? 'px-4' : 'px-0',
          )}
          ref={menuRef}
        >
          {/* Custom Scroll Arrow - Above Settings */}
          {canScroll && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={scrollToBottom}
                  className={cn(
                    'w-full flex items-center transition-all duration-500 relative group mb-1 rounded-2xl py-3',
                    isLayoutExpanded
                      ? 'justify-start gap-4 px-4'
                      : 'justify-center w-12 mx-auto',
                    'bg-primary/10 text-primary hover:bg-primary hover:text-white shadow-lg shadow-primary/5 hover:shadow-primary/20',
                  )}
                >
                  <div className="relative z-10 shrink-0 transition-transform duration-500 group-hover:scale-110">
                    <ChevronDown size={18} className="animate-bounce" />
                  </div>
                  {isLayoutExpanded && (
                    <span className="text-[12px] font-bold opacity-100 translate-x-0 transition-all duration-500">
                      See more
                    </span>
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

          <NavItem
            to="/settings"
            icon={<Settings2 size={18} />}
            active={isActive('/settings')}
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
                showLogoutMenu
                  ? 'bg-muted/40 border-border/50 shadow-inner'
                  : '',
              )}
            >
              <div className="relative shrink-0">
                <div
                  className={`w-10 h-10 rounded-full ${user.profilePicture ? 'bg-primary/10' : 'bg-primary'} flex items-center justify-center text-primary-foreground font-black shadow-lg shadow-primary/30 ring-2 ring-primary transition-all duration-500 hover:brightness-110 overflow-hidden`}
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
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full shadow-sm" />
              </div>

              {isLayoutExpanded && (
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-xs font-black tracking-tight truncate w-full text-left bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {capitalize(userName)}
                  </span>
                  <span className="text-[9px] font-black tracking-wide text-muted-foreground/60 truncate w-full text-left">
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

const NavItem = ({ to, icon, active, label, isExpanded }) => {
  const content = (
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
