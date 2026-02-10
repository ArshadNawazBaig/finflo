import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import SuperAdminSidebar from '@/components/SuperAdminSidebar';
import Navbar from '@/components/Navbar';

const SuperAdminLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Redirect if not super admin
  useEffect(() => {
    if (!user.token || user.role !== 'super_admin') {
      navigate('/login');
    }
  }, [user, navigate]);

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
    <div className="flex h-screen bg-background text-foreground font-sans relative overflow-hidden">
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
          isMobile ? 'ml-0 w-full' : isSidebarExpanded ? 'ml-64' : 'ml-[70px]',
        )}
      >
        <Navbar
          onMenuClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          isSidebarExpanded={isSidebarExpanded}
        />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 w-full">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
