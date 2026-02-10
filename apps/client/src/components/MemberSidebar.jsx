import { useState, useRef, useEffect } from 'react';
import { LayoutGrid, FileText, LogOut, ChevronUp, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn, capitalize } from '@/lib/utils';

const MemberSidebar = ({ isExpanded, isMobile, onClose }) => {
  const location = useLocation();
  const isActive = (path) =>
    location.pathname === path ||
    (path !== '/member/dashboard' && location.pathname.startsWith(path + '/'));
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const menuRef = useRef(null);

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
    localStorage.removeItem('memberToken');
    localStorage.removeItem('member');
    window.location.href = '/member/login';
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
  const memberName = member.name || 'Member';
  const memberRole = member.role || 'Member';

  const sidebarClasses = cn(
    'h-screen h-[100dvh] flex flex-col items-center py-4 bg-card/95 backdrop-blur-xl border-r border-border/50 fixed top-0 left-0 z-[50] transition-all duration-300 ease-in-out z-[101]',
    // Mobile specific classes
    isMobile
      ? `w-64 transform ${isExpanded ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`
      : // Desktop specific classes
        isExpanded
        ? 'w-64 items-start px-4'
        : 'w-[70px] items-center px-2',
  );

  // For mobile, we always want the "expanded" internal layout when visible
  // For desktop, it follows the actual isExpanded state
  const isLayoutExpanded = isMobile ? true : isExpanded;

  return (
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
        <div className="w-10 h-10 bg-primary shadow-lg shadow-primary/20 rounded-xl flex items-center justify-center text-primary-foreground font-black text-xl transform transition-transform hover:scale-105 cursor-pointer">
          LM
        </div>
      </div>

      <nav
        className={cn(
          'flex-1 flex flex-col gap-1 w-full overflow-y-auto scrollbar-hide py-2',
          isLayoutExpanded ? 'px-4' : 'items-center px-0',
        )}
      >
        <NavItem
          to="/member/dashboard"
          icon={<LayoutGrid size={18} />}
          active={isActive('/member/dashboard')}
          label="Dashboard"
          isExpanded={isLayoutExpanded}
        />
        <NavItem
          to="/member/loans"
          icon={<FileText size={18} />}
          active={isActive('/member/loans')}
          label="My Loans"
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
              'w-full flex items-center rounded-xl p-2 transition-all duration-200 border border-transparent hover:border-border/50 hover:bg-muted/50 group',
              isLayoutExpanded
                ? 'justify-start gap-3 px-3'
                : 'justify-center w-10 h-10 p-0',
              showLogoutMenu ? 'bg-muted/50 border-border/50' : '',
            )}
          >
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/20 shrink-0">
              {memberInitials}
            </div>

            {isLayoutExpanded && (
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-sm font-bold truncate w-full text-left">
                  {capitalize(memberName)}
                </span>
                <span className="text-xs text-muted-foreground truncate w-full text-left">
                  {memberRole}
                </span>
              </div>
            )}

            {isLayoutExpanded && (
              <ChevronUp
                size={16}
                className={cn(
                  'ml-auto text-muted-foreground transition-transform duration-200',
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

const NavItem = ({ to, icon, active, label, isExpanded }) => (
  <Link
    to={to}
    className={cn(
      'px-0 py-3 rounded-xl transition-all duration-300 flex items-center relative group overflow-visible whitespace-nowrap ',
      isExpanded ? 'justify-start gap-4 px-4' : 'justify-center w-10',
      active
        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 '
        : 'text-muted-foreground hover:bg-primary/10 hover:text-primary',
    )}
  >
    <div className="relative z-10 shrink-0">{icon}</div>

    <span
      className={cn(
        'transition-all duration-300 origin-left text-sm font-semibold tracking-wide',
        isExpanded
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 -translate-x-4 w-0 hidden',
      )}
    >
      {label}
    </span>

    {/* Custom Tooltip - only show when collapsed */}
    {!isExpanded && (
      <div className="absolute left-full ml-3 px-3 py-2 bg-white dark:bg-slate-800 text-foreground text-xs font-semibold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[100] shadow-lg border border-border/50 pointer-events-none">
        {label}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-white dark:bg-slate-800 rotate-45 border-l border-b border-border/50" />
      </div>
    )}
  </Link>
);

export default MemberSidebar;
