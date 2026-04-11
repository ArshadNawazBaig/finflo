import { useEffect, useState, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAtom, useSetAtom } from 'jotai';
import {
  isSidebarExpandedAtom,
  subscriptionAtom,
  userAtom,
  pendingMembersCountAtom,
} from '@/atoms';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import InstallPrompt from '@/components/InstallPrompt';
import OnboardingGuide from '@/components/ui/OnboardingGuide';
import { adminOnboardingSteps } from '@/config/onboardingSteps';
import { useIsMobile } from '@/hooks/useIsMobile';

import api from '@/lib/axios';
import PlanLimitBanner from '@/components/PlanLimitBanner';
import { SocketProvider } from '@/context/SocketContext';

const DashboardLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useAtom(
    isSidebarExpandedAtom,
  );
  const isMobile = useIsMobile();
  const location = useLocation();
  const setSubscription = useSetAtom(subscriptionAtom);
  const [user, setUser] = useAtom(userAtom);
  const setPendingCount = useSetAtom(pendingMembersCountAtom);

  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Fetch latest user data and subscription
  const fetchData = async () => {
    try {
      const [{ data: userData }, { data: subData }] = await Promise.all([
        api.get('/auth/me'),
        api.get('/subscription'),
      ]);
      // Merge with existing state to preserve the token and other fields.
      setUser((prev) => ({ ...prev, ...userData }));
      window.dispatchEvent(new Event('userUpdated'));
      setPendingCount(userData.pendingMembersCount || 0);

      setSubscription({
        plan: subData.plan || 'Free',
        usage: subData.usage || { loans: 0, members: 0, branches: 0 },
        limits: subData.limits || null,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to sync layout data:', error);
      setSubscription((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for custom events to refresh data (e.g., after subscription upgrade)
    window.addEventListener('subscriptionUpdated', fetchData);

    return () => {
      window.removeEventListener('subscriptionUpdated', fetchData);
    };
  }, [setUser, setSubscription]);

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

  const handleScroll = (e) => {
    if (!isMobile) return;
    const currentScrollY = e.target.scrollTop;
    
    if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsNavVisible(false); // scrolling down
      } else {
        setIsNavVisible(true); // scrolling up
      }
      lastScrollY.current = currentScrollY;
    }
  };

  return (
    <SocketProvider userType="user">
      <div className="flex h-[100dvh] bg-background text-foreground font-sans relative overflow-hidden">
        <Sidebar
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
            isVisible={isNavVisible}
          />
          <div
            onScroll={handleScroll}
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
              <PlanLimitBanner />
              <Outlet />
              <div className="h-32 lg:h-8 shrink-0" />
            </div>
          </div>
        </div>

        {/* Mobile-First Navigation */}
        <MobileBottomNav isVisible={isNavVisible} />
        <InstallPrompt />
        <OnboardingGuide
          steps={adminOnboardingSteps}
          userId={user?._id}
          role="admin"
        />
      </div>
    </SocketProvider>
  );
};

export default DashboardLayout;
