import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sun, Moon, ChevronRight, X, Menu } from 'lucide-react';

const Navigation = ({
  scrollY,
  isMenuOpen,
  setIsMenuOpen,
  theme,
  setTheme,
}) => {
  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          scrollY > 30
            ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-b border-slate-200 dark:border-white/5 py-4 shadow-xl'
            : 'py-8'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-11 h-11 bg-primary shadow-2xl shadow-primary/40 rounded-2xl flex items-center justify-center text-primary-foreground font-black text-xl group-hover:rotate-6 transition-all duration-500">
              LM
            </div>
            <div className="flex flex-col -gap-1">
              <span className="text-xl font-black tracking-tighter leading-none">
                LOANMASTER
              </span>
              <span className="text-[10px] font-black tracking-[0.3em] text-primary uppercase">
                Infrastructure
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-10">
            {['Architecture', 'The Workbench', 'Scale'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-primary transition-all relative group"
              >
                {item}
                <span className="absolute -bottom-1.5 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-200/50 dark:bg-white/5 hover:bg-primary/10 transition-colors text-slate-600 dark:text-slate-400"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="hidden sm:flex items-center gap-3">
              <Link
                to="/login"
                className="text-xs font-black uppercase tracking-widest px-6 py-2.5 hover:text-primary transition-colors"
              >
                Access Portal
              </Link>
              <Link
                to="/register"
                className="bg-primary text-primary-foreground px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all active:scale-95 flex items-center gap-2 group"
              >
                Get Started
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden w-11 h-11 bg-slate-200/50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-foreground transition-all active:scale-95"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
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
