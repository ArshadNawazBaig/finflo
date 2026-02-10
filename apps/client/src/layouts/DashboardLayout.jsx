import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import InstallPrompt from '@/components/InstallPrompt';

const DashboardLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
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
      // On desktop, we preserve the user's choice (don't auto-expand)
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
          isMobile ? 'ml-0 w-full' : isSidebarExpanded ? 'ml-64' : 'ml-[70px]',
        )}
      >
        <Navbar
          onMenuClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          isSidebarExpanded={isSidebarExpanded}
        />
        <div
          className={cn(
            'flex-1 overflow-y-auto p-4 md:p-8 w-full transition-all duration-500',
            isMobile ? 'pb-32' : '',
          )}
        >
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </div>

      {/* Mobile-First Navigation */}
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
};

export default DashboardLayout;
