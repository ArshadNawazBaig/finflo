import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sun, Moon, ChevronRight, X, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import Logo from '@/components/Logo';

const Navigation = ({
  scrollY,
  isMenuOpen,
  setIsMenuOpen,
  theme,
  setTheme,
}) => {
  const isMobile = useMediaQuery('(max-width: 1024px)');
  return (
    <>
      <nav
        className={cn(
          'fixed left-0 right-0 z-[100] transition-all duration-500 flex justify-center',
          scrollY > 30 || isMobile ? 'top-12 px-4' : 'top-0 py-8 px-6',
        )}
      >
        <div
          className={cn(
            'transition-all duration-500 flex items-center justify-between',
            scrollY > 30 || isMobile
              ? 'w-[92%] max-w-sm sm:max-w-7xl mx-auto bg-background/95 backdrop-blur-xl border border-border/40 rounded-full py-1.5 px-4 shadow-[0_8px_32px_rgba(0,0,0,0.15)]'
              : 'w-full max-w-7xl mx-auto',
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
                className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-primary transition-all relative group"
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
              <Link
                to="/login"
                className="text-[10px] font-black uppercase tracking-widest px-4 py-2 hover:text-primary transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all active:scale-95 flex items-center gap-2 group"
              >
                Join
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
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
              <Link
                to="/register"
                className="block w-full py-5 bg-primary text-primary-foreground text-center rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-primary/20"
              >
                Start Deploying
              </Link>
              <Link
                to="/login"
                className="block w-full py-5 border border-slate-200 dark:border-white/10 text-center rounded-2xl font-black uppercase tracking-widest text-sm"
              >
                Login to Portal
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;
