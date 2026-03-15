import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { isSidebarExpandedAtom } from '@/atoms';
import { cn } from '@/lib/utils';
import MemberSidebar from '@/components/member/MemberSidebar';
import MemberNavbar from '@/components/member/MemberNavbar';
import MemberBottomNav from '@/components/member/MemberBottomNav';
import InstallPrompt from '@/components/InstallPrompt';
import { SocketProvider } from '@/context/SocketContext';
import OnboardingGuide from '@/components/ui/OnboardingGuide';
import { memberOnboardingSteps } from '@/config/onboardingSteps';
import { Suspense } from 'react';
import DashboardSkeleton from '@/components/ui/DashboardSkeleton';

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
    <SocketProvider userType="member">
      <div className="member-portal flex h-[100dvh] bg-background text-foreground font-sans relative overflow-hidden text-sm">
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
            isMobile
              ? 'ml-0 w-full'
              : isSidebarExpanded
                ? 'ml-64'
                : 'ml-[70px]',
          )}
        >
          <MemberNavbar
            onMenuClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            isSidebarExpanded={isSidebarExpanded}
          />
          <div
            className={cn(
              'flex-1 overflow-y-auto w-full transition-all duration-500',
              isMobile ? 'pt-28' : 'p-4 md:p-8',
            )}
          >
            <div
              className={cn(
                'max-w-7xl mx-auto flex flex-col px-4 lg:px-0',
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
        <MemberBottomNav />
        <InstallPrompt />
        <OnboardingGuide
          steps={memberOnboardingSteps}
          userId={JSON.parse(localStorage.getItem('member') || '{}')._id}
          role="member"
        />
      </div>
    </SocketProvider>
  );
};

export default MemberLayout;
