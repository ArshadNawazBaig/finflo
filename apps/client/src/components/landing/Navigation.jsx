import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, ChevronRight, X, Menu, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import Logo from '@/components/Logo';
import { getAppUrl, IS_LANDING_DOMAIN, IS_DEV } from '@/lib/constants';

const Navigation = ({
  scrollY,
  isMenuOpen,
  setIsMenuOpen,
  theme,
  setTheme,
}) => {
  const isMobile = useMediaQuery('(max-width: 1024px)');

  // On the landing domain (finflo.org), localStorage is origin-scoped and cannot
  // access auth state stored on app.finflo.org. We detect this and always show
  // both Login/Join AND a Dashboard link — the Dashboard link redirects to
  // app.finflo.org where AppRootRedirect handles the actual auth check.
  const isCrossDomain = IS_LANDING_DOMAIN && !IS_DEV;

  let isBusinessLoggedIn = false;
  let isMemberLoggedIn = false;

  if (!isCrossDomain) {
    // Same-origin (dev mode or app domain) — localStorage is accessible
    const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
    const memberRaw = localStorage.getItem('member');
    const loggedInMember = memberRaw && memberRaw !== 'null' ? JSON.parse(memberRaw) : {};
    isBusinessLoggedIn = Object.keys(loggedInUser).length > 0;
    isMemberLoggedIn = Object.keys(loggedInMember).length > 0;
  } else {
    // Cross-domain (finflo.org landing page) — localStorage is not shared.
    // We check for the cookie that we sync from app.finflo.org
    isBusinessLoggedIn = document.cookie.includes('finflo_business_auth=true');
    isMemberLoggedIn = document.cookie.includes('finflo_member_auth=true');
  }

  const isLoggedIn = isBusinessLoggedIn || isMemberLoggedIn;
  const [isJoinMenuOpen, setIsJoinMenuOpen] = useState(false);
  const [isLoginMenuOpen, setIsLoginMenuOpen] = useState(false);
  const joinMenuRef = useRef(null);
  const loginMenuRef = useRef(null);

  const AppLink = ({ to, children, ...props }) => {
    if (IS_LANDING_DOMAIN && !IS_DEV) {
      return (
        <a href={getAppUrl(to)} {...props}>
          {children}
        </a>
      );
    }
    return (
      <Link to={to} {...props}>
        {children}
      </Link>
    );
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (joinMenuRef.current && !joinMenuRef.current.contains(event.target)) {
        setIsJoinMenuOpen(false);
      }
      if (
        loginMenuRef.current &&
        !loginMenuRef.current.contains(event.target)
      ) {
        setIsLoginMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <>
      <nav
        className={cn(
          'fixed left-0 right-0 z-[100] transition-all duration-500 flex justify-center',
          isMobile
            ? 'top-12 px-4'
            : scrollY > 30
              ? 'top-0 py-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-b border-slate-100 dark:border-white/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
              : 'top-0 py-6',
        )}
      >
        <div
          className={cn(
            'transition-all duration-500 flex items-center justify-between w-full max-w-7xl mx-auto px-6 sm:px-4 xl:px-2 2xl:px-0',
            isMobile &&
              'w-[92%] max-w-sm mx-auto bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border border-slate-200/60 dark:border-white/[0.06] rounded-full py-1.5 px-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)]',
          )}
        >
          <Link
            to="/"
            className="hover:scale-105 transition-transform flex items-center"
          >
            <Logo
              showText={!isMobile || scrollY <= 30}
              className="h-8 w-auto"
            />
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {['Architecture', 'The Workbench', 'Scale'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-primary transition-all group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors text-slate-500 dark:text-slate-400"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <div className="hidden sm:flex items-center gap-3">
              {isLoggedIn ? (
                <>
                  <AppLink
                    to={isBusinessLoggedIn ? "/dashboard" : "/member/dashboard"}
                    className="text-[13px] font-medium px-4 py-2 hover:text-primary transition-colors"
                  >
                    Dashboard
                  </AppLink>
                  <AppLink
                    to={isBusinessLoggedIn ? "/join" : "/register"}
                    className="bg-primary text-white px-5 py-2.5 rounded-xl text-[13px] font-medium shadow-md shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:translate-y-0 flex items-center gap-2 group"
                  >
                    {isBusinessLoggedIn ? "Member Console" : "Business Console"}
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </AppLink>
                </>
              ) : (
                <>
                  <div className="relative" ref={loginMenuRef}>
                    <button
                      onClick={() => {
                        setIsLoginMenuOpen(!isLoginMenuOpen);
                        setIsJoinMenuOpen(false);
                      }}
                      className="text-[13px] font-medium px-4 py-2 hover:text-primary transition-colors flex items-center gap-1 group"
                    >
                      Login
                      <ChevronRight
                        className={cn(
                          'w-3 h-3 transition-transform',
                          isLoginMenuOpen
                            ? 'rotate-90'
                            : 'group-hover:translate-x-0.5',
                        )}
                      />
                    </button>
                    <div
                      className={cn(
                        'absolute right-0 mt-2 w-56 bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/[0.06] rounded-xl shadow-[0_8px_30px_-8px_rgba(0,0,0,0.12)] overflow-hidden z-[110] backdrop-blur-xl',
                        'transition-all duration-150 origin-top-right',
                        isLoginMenuOpen
                          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                          : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
                      )}
                    >
                      <div className="p-2">
                        <AppLink
                          to="/login"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group"
                          onClick={() => setIsLoginMenuOpen(false)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <ChevronRight size={14} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase tracking-wider">
                              As Business
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Access admin portal
                            </span>
                          </div>
                        </AppLink>
                        <AppLink
                          to="/member/login"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group"
                          onClick={() => setIsLoginMenuOpen(false)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <ChevronRight size={14} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase tracking-wider">
                              As Member
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Access member portal
                            </span>
                          </div>
                        </AppLink>
                      </div>
                    </div>
                  </div>
                  <div className="relative" ref={joinMenuRef}>
                    <button
                      onClick={() => {
                        setIsJoinMenuOpen(!isJoinMenuOpen);
                        setIsLoginMenuOpen(false);
                      }}
                      className="bg-primary text-white px-5 py-2.5 rounded-xl text-[13px] font-medium shadow-md shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:translate-y-0 flex items-center gap-2 group"
                    >
                      Join
                      <ChevronRight
                        className={cn(
                          'w-3 h-3 transition-transform',
                          isJoinMenuOpen
                            ? 'rotate-90'
                            : 'group-hover:translate-x-1',
                        )}
                      />
                    </button>
                    <div
                      className={cn(
                        'absolute right-0 mt-2 w-56 bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/[0.06] rounded-xl shadow-[0_8px_30px_-8px_rgba(0,0,0,0.12)] overflow-hidden z-[110] backdrop-blur-xl',
                        'transition-all duration-150 origin-top-right',
                        isJoinMenuOpen
                          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                          : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
                      )}
                    >
                      <div className="p-2">
                        <AppLink
                          to="/register"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group"
                          onClick={() => setIsJoinMenuOpen(false)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <ChevronRight size={14} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase tracking-wider">
                              As Business
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Register your company
                            </span>
                          </div>
                        </AppLink>
                        <AppLink
                          to="/join"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group"
                          onClick={() => setIsJoinMenuOpen(false)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <ChevronRight size={14} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase tracking-wider">
                              As Member
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Join a business group
                            </span>
                          </div>
                        </AppLink>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden w-9 h-9 bg-slate-200/50 dark:bg-white/5 rounded-full flex items-center justify-center text-foreground transition-all active:scale-95"
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>

      <div
        className={cn(
          'fixed inset-0 z-[150] bg-white dark:bg-slate-950 lg:hidden flex flex-col p-8',
          'transition-transform duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)]',
          isMenuOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-hidden={!isMenuOpen}
      >
            <div className="flex justify-end mb-12">
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex flex-col gap-8">
              {['Architecture', 'The Workbench', 'Scale'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(' ', '-')}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-5xl font-black tracking-tighter"
                >
                  {item}
                </a>
              ))}
            </div>
            <div className="mt-auto space-y-4">
              {isBusinessLoggedIn ? (
                <>
                  <AppLink
                    to="/join"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full py-5 bg-primary text-primary-foreground text-center rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-primary/20"
                  >
                    Member Console
                  </AppLink>
                  <AppLink
                    to="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full py-5 border border-slate-200 dark:border-white/10 text-center rounded-2xl font-black uppercase tracking-widest text-sm"
                  >
                    Go to Dashboard
                  </AppLink>
                </>
              ) : isMemberLoggedIn ? (
                <>
                  <AppLink
                    to="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full py-5 bg-primary text-primary-foreground text-center rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-primary/20"
                  >
                    Business Console
                  </AppLink>
                  <AppLink
                    to="/member/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full py-5 border border-slate-200 dark:border-white/10 text-center rounded-2xl font-black uppercase tracking-widest text-sm"
                  >
                    Go to Dashboard
                  </AppLink>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                        <AppLink
                          to="/register"
                          onClick={() => setIsMenuOpen(false)}
                          className="py-4 bg-slate-100 dark:bg-white/5 text-center rounded-2xl font-black uppercase tracking-widest text-[10px]"
                        >
                          Join as Business
                        </AppLink>
                        <AppLink
                          to="/join"
                          onClick={() => setIsMenuOpen(false)}
                          className="py-4 bg-primary text-primary-foreground text-center rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                        >
                          Join as Member
                        </AppLink>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <AppLink
                          to="/login"
                          onClick={() => setIsMenuOpen(false)}
                          className="py-4 border border-slate-200 dark:border-white/10 text-center rounded-2xl font-black uppercase tracking-widest text-[10px]"
                        >
                          Login as Business
                        </AppLink>
                        <AppLink
                          to="/member/login"
                          onClick={() => setIsMenuOpen(false)}
                          className="py-4 border border-slate-200 dark:border-white/10 text-center rounded-2xl font-black uppercase tracking-widest text-[10px]"
                        >
                          Login as Member
                        </AppLink>
                      </div>
                </>
              )}
            </div>
      </div>
    </>
  );
};

export default Navigation;
