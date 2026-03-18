import { useAtom } from 'jotai';
import { isSidebarExpandedAtom, memberAtom } from '@/atoms';
import { cn } from '@/lib/utils';
import MemberSidebar from '@/components/member/MemberSidebar';
import MemberNavbar from '@/components/member/MemberNavbar';
import MemberBottomNav from '@/components/member/MemberBottomNav';
import InstallPrompt from '@/components/InstallPrompt';
import { SocketProvider } from '@/context/SocketContext';
import OnboardingGuide from '@/components/ui/OnboardingGuide';
import { memberOnboardingSteps } from '@/config/onboardingSteps';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import api from '@/lib/axios';

const MemberLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useAtom(
    isSidebarExpandedAtom,
  );
  const isMobile = useIsMobile();
  const location = useLocation();
  const [member, setMember] = useAtom(memberAtom);

  const fetchData = async () => {
    try {
      const { data: memberData } = await api.get('/member-auth/me');
      // memberAtom (atomWithStorage) handles the localStorage sync automatically
      setMember((prev) => ({ ...prev, ...memberData }));
    } catch (error) {
      console.error('Failed to sync member layout data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Close sidebar on mobile/tablet by default
  useEffect(() => {
    if (isMobile) {
      setIsSidebarExpanded(false);
    }
  }, [isMobile, setIsSidebarExpanded]);

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
              <Outlet />
              <div className="h-32 lg:h-8 shrink-0" />
            </div>
          </div>
        </div>

        {/* Mobile-First Navigation */}
        <MemberBottomNav />
        <InstallPrompt />
        <OnboardingGuide
          steps={memberOnboardingSteps}
          userId={member?._id}
          role="member"
        />
      </div>
    </SocketProvider>
  );
};

export default MemberLayout;
