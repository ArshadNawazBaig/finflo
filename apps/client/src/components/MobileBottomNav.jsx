import { useRef, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Users,
  WalletMinimal,
  Settings2,
  Bell,
  FileQuestion,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MobileBottomNav = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname);

  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location.pathname]);

  const navItems = [
    { icon: <LayoutGrid size={20} />, label: 'Home', path: '/dashboard' },
    { icon: <WalletMinimal size={20} />, label: 'Loans', path: '/loans' },
    {
      icon: <FileQuestion size={20} />,
      label: 'Requests',
      path: '/loan-requests',
    },
    { icon: <Users size={20} />, label: 'Users', path: '/customers' },
    { icon: <Bell size={20} />, label: 'Alerts', path: '/notifications' },
    { icon: <Settings2 size={20} />, label: 'More', path: '/settings' },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
      <nav className="max-w-md mx-auto bg-card/90 backdrop-blur-2xl border border-border/50 rounded-[2rem] shadow-2xl flex items-center justify-around p-2 pointer-events-auto ring-1 ring-white/5">
        {navItems.map((item) => {
          const isActive =
            activeTab === item.path ||
            (item.path !== '/dashboard' && activeTab.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500 group',
                isActive
                  ? 'text-primary scale-110 hover:brightness-110'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30',
              )}
            >
              <div
                className={cn(
                  'relative z-10 transition-transform duration-500',
                  isActive ? 'translate-y-[-2px]' : '',
                )}
              >
                {item.icon}
              </div>

              <span
                className={cn(
                  'text-[8px] font-black uppercase tracking-widest mt-1 transition-all duration-500',
                  isActive
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-1',
                )}
              >
                {item.label}
              </span>

              {isActive && (
                <div className="absolute inset-0 bg-primary/10 rounded-2xl animate-in fade-in zoom-in duration-300" />
              )}

              {isActive && (
                <div className="absolute -top-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_10px_#6366f1]" />
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileBottomNav;
