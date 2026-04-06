import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sun, Moon, ChevronRight, X, Menu } from 'lucide-react';
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
  const loggedInUser = (JSON.parse(localStorage.getItem('user') || '{}') || {});
  const memberRaw = localStorage.getItem('member');
  const loggedInMember = memberRaw && memberRaw !== 'null' ? JSON.parse(memberRaw) : {};
  const isBusinessLoggedIn = Object.keys(loggedInUser).length > 0;
  const isMemberLoggedIn = Object.keys(loggedInMember).length > 0;
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
              ? 'top-0 py-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-b border-slate-200 dark:border-white/5 shadow-xl'
              : 'top-0 py-8',
        )}
      >
        <div
          className={cn(
            'transition-all duration-500 flex items-center justify-between w-full max-w-7xl mx-auto px-6 sm:px-4 xl:px-2 2xl:px-0',
            isMobile &&
              'w-[92%] max-w-sm mx-auto bg-background/95 backdrop-blur-xl border border-border/40 rounded-full py-1.5 px-4 shadow-[0_8px_32px_rgba(0,0,0,0.15)]',
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

          <div className="hidden lg:flex items-center gap-10">
            {['Architecture', 'The Workbench', 'Scale'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="text-[12px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-primary transition-all relative group"
              >
                {item}
                <span className="absolute -bottom-1.5 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-200/50 dark:bg-white/5 hover:bg-primary/10 transition-colors text-slate-600 dark:text-slate-400"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="hidden sm:flex items-center gap-3">
              {isLoggedIn ? (
                <>
                  <AppLink
                    to={isBusinessLoggedIn ? "/dashboard" : "/member/dashboard"}
                    className="text-[12px] font-black uppercase tracking-widest px-4 py-2 hover:text-primary transition-colors"
                  >
                    Dashboard
                  </AppLink>
                  <AppLink
                    to={isBusinessLoggedIn ? "/join" : "/register"}
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-[12px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all active:scale-95 flex items-center gap-2 group"
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
                      className="text-[12px] font-black uppercase tracking-widest px-4 py-2 hover:text-primary transition-colors flex items-center gap-1 group"
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
                    <AnimatePresence>
                      {isLoginMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[110] backdrop-blur-xl"
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="relative" ref={joinMenuRef}>
                    <button
                      onClick={() => setIsJoinMenuOpen(!isJoinMenuOpen)}
                      className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-[12px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all active:scale-95 flex items-center gap-2 group"
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
                    <AnimatePresence>
                      {isJoinMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[110] backdrop-blur-xl"
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
                        </motion.div>
                      )}
                    </AnimatePresence>
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

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[150] bg-white dark:bg-slate-950 lg:hidden flex flex-col p-8"
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;
