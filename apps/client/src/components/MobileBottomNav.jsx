import { useRef, useEffect, useState, cloneElement } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Users,
  WalletMinimal,
  Settings2,
  Bell,
  BarChart3,
  TrendingUp,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MobileBottomNav = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname);

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user') || '{}'),
  );

  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const handleUserUpdate = () => {
      setUser(JSON.parse(localStorage.getItem('user') || '{}'));
    };
    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, []);

  const isSuperAdminPath = location.pathname.startsWith('/super-admin');

  const navItems = isSuperAdminPath
    ? [
        { icon: <LayoutGrid size={20} />, label: 'Home', path: '/super-admin' },
        {
          icon: <Users size={20} />,
          label: 'Users',
          path: '/super-admin/users',
        },
        {
          icon: <BarChart3 size={20} />,
          label: 'Revenue',
          path: '/super-admin/revenue',
        },
        {
          icon: <History size={20} />,
          label: 'Logs',
          path: '/super-admin/activity-logs',
        },
        {
          icon: <TrendingUp size={20} />,
          label: 'Stats',
          path: '/super-admin/analytics',
        },
        {
          icon: <WalletMinimal size={20} />,
          label: 'Backup',
          path: '/super-admin/backup',
        },
        {
          icon: <Settings2 size={20} />,
          label: 'More',
          path: '/super-admin/settings',
        },
      ]
    : [
        { icon: <LayoutGrid size={20} />, label: 'Home', path: '/dashboard' },
        { icon: <WalletMinimal size={20} />, label: 'Loans', path: '/loans' },
        { icon: <Users size={20} />, label: 'Users', path: '/customers' },
        { icon: <History size={20} />, label: 'Ledger', path: '/transactions' },
        {
          icon: <TrendingUp size={20} />,
          label: 'Payouts',
          path: '/distributions',
        },
        { icon: <Bell size={20} />, label: 'Alerts', path: '/notifications' },
        { icon: <Settings2 size={20} />, label: 'More', path: '/settings' },
      ];

  return (
    <div className="lg:hidden fixed bottom-6 left-0 right-0 z-[100] px-4 pointer-events-none mb-safe-area-inset-bottom">
      <nav className="w-[92%] max-w-sm mx-auto bg-background/95 backdrop-blur-xl border border-border/40 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.15)] flex items-center justify-around p-1.5 pointer-events-auto relative overflow-hidden group">
        {navItems.map((item) => {
          const isActive =
            activeTab === item.path ||
            (item.path !== '/dashboard' &&
              item.path !== '/super-admin' &&
              activeTab.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'relative flex items-center justify-center transition-all duration-500 rounded-full overflow-hidden',
                isActive
                  ? 'bg-primary text-primary-foreground px-6 py-3 shadow-lg shadow-primary/30'
                  : 'text-muted-foreground/50 hover:text-muted-foreground p-3.5',
              )}
            >
              <motion.div
                layout
                className="relative z-20 flex items-center gap-2"
              >
                <div className="shrink-0">
                  {item.icon &&
                    cloneElement(item.icon, {
                      size: 20,
                      strokeWidth: isActive ? 2.5 : 2,
                    })}
                </div>
                <AnimatePresence mode="popLayout">
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0, width: 0, x: -10 }}
                      animate={{ opacity: 1, width: 'auto', x: 0 }}
                      exit={{ opacity: 0, width: 0, x: -10 }}
                      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                      className="text-xs font-bold tracking-tight whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileBottomNav;
