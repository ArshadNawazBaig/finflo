import { useEffect, useState, cloneElement } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  FileText,
  History,
  Send,
  TrendingUp,
  WalletMinimal,
  Settings2,
  MessageSquare,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAtomValue } from 'jotai';
import { unreadChatCountAtom } from '@/atoms';

const MemberBottomNav = ({ isVisible = true }) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname);
  const unreadChatCount = useAtomValue(unreadChatCountAtom);

  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location.pathname]);

  const navItems = [
    {
      icon: <LayoutGrid size={20} />,
      label: 'Home',
      path: '/member/dashboard',
    },
    {
      icon: <WalletMinimal size={20} />,
      label: 'Wallet',
      path: '/member/wallet',
    },
    {
      icon: <Send size={20} />,
      label: 'Transfer',
      path: '/member/transfer',
    },
    {
      icon: <MessageSquare size={20} />,
      label: 'Chat',
      path: '/member/chat',
    },
    {
      icon: <Settings2 size={20} />,
      label: 'More',
      path: '/member/settings',
    },
  ];

  return (
    <div
      className={cn(
        'lg:hidden fixed left-0 right-0 z-[100] px-4 pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.3,1,0.2,1)]',
        !isVisible && 'translate-y-[150%] opacity-0'
      )}
      style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 12px))' }}
    >
      <nav className="w-[92%] max-w-sm mx-auto bg-background/95 backdrop-blur-xl border border-border/40 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.15)] flex items-center justify-around p-1.5 pointer-events-auto relative overflow-hidden group">
        {navItems.map((item) => {
          const isActive =
            activeTab === item.path ||
            (item.path !== '/member/dashboard' &&
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
                <div className="shrink-0 relative">
                  {item.icon &&
                    cloneElement(item.icon, {
                      size: 20,
                      strokeWidth: isActive ? 2.5 : 2,
                    })}

                  {item.label === 'Chat' && unreadChatCount > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[8px] font-black rounded-full min-w-[14px] h-[14px] flex items-center justify-center border-2 border-background shadow-sm">
                      {unreadChatCount > 9 ? '9+' : unreadChatCount}
                    </div>
                  )}
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

export default MemberBottomNav;
