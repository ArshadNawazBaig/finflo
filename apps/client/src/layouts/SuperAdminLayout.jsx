import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { isSidebarExpandedAtom } from '@/atoms';
import { cn } from '@/lib/utils';
import SuperAdminSidebar from '@/components/SuperAdminSidebar';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import InstallPrompt from '@/components/InstallPrompt';
import { SocketProvider } from '@/context/SocketContext';
import { Suspense } from 'react';
import DashboardSkeleton from '@/components/ui/DashboardSkeleton';

const SuperAdminLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useAtom(
    isSidebarExpandedAtom,
  );
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Handle resize and initial check
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarExpanded(false);
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
    <SocketProvider userType="user">
      <div className="flex h-[100dvh] bg-background text-foreground font-sans relative overflow-hidden">
        <SuperAdminSidebar
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
            isMobile
              ? 'ml-0 w-full'
              : isSidebarExpanded
                ? 'ml-64'
                : 'ml-[70px]',
          )}
        >
          <Navbar
            onMenuClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            isSidebarExpanded={isSidebarExpanded}
          />
          <div
            className={cn(
              'flex-1 overflow-y-auto w-full transition-all duration-500',
              isMobile ? 'pt-36 px-4' : 'p-4 md:p-8',
            )}
          >
            <div
              className={cn(
                'max-w-7xl mx-auto flex flex-col',
                isMobile ? 'pb-10' : 'h-full min-h-full',
              )}
            >
              <Suspense fallback={<DashboardSkeleton />}>
                <Outlet />
              </Suspense>
              <div className="h-32 lg:hidden shrink-0" />
            </div>
          </div>
        </div>

        {/* Mobile-First Navigation */}
        <MobileBottomNav />
        <InstallPrompt />
      </div>
    </SocketProvider>
  );
};

export default SuperAdminLayout;
