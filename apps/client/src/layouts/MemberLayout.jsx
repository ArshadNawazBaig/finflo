import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { isSidebarExpandedAtom } from '@/atoms';
import { cn } from '@/lib/utils';
import MemberSidebar from '@/components/member/MemberSidebar';
import MemberNavbar from '@/components/member/MemberNavbar';
import MemberBottomNav from '@/components/member/MemberBottomNav';
import InstallPrompt from '@/components/InstallPrompt';
import ChatSync from '@/components/ChatSync';

const MemberLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useAtom(
    isSidebarExpandedAtom,
  );
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  // Handle resize and initial check
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint to include tablets
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarExpanded(false); // Default to closed on mobile/tablet
      }
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Close sidebar on route change on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarExpanded(false);
    }
  }, [location, isMobile]);

  return (
    <div className="member-portal flex h-[100dvh] bg-background text-foreground font-sans relative overflow-hidden text-sm">
      <ChatSync userType="member" />
      <MemberSidebar
        isExpanded={isSidebarExpanded}
        isMobile={isMobile}
        onClose={() => setIsSidebarExpanded(false)}
      />

      {/* Mobile Overlay */}
      {isMobile && isSidebarExpanded && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarExpanded(false)}
        />
      )}

      <div
        className={cn(
          'flex-1 flex flex-col h-full transition-[margin] duration-300 ease-in-out',
          isMobile ? 'ml-0 w-full' : isSidebarExpanded ? 'ml-64' : 'ml-[70px]',
        )}
      >
        <MemberNavbar
          onMenuClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          isSidebarExpanded={isSidebarExpanded}
        />
        <div
          className={cn(
            'flex-1 overflow-y-auto w-full transition-all duration-500',
            isMobile ? 'pb-36 pt-36 px-4' : 'p-4 md:p-8',
          )}
        >
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </div>

      {/* Mobile-First Navigation */}
      <MemberBottomNav />
      <InstallPrompt />
    </div>
  );
};

export default MemberLayout;
