import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/atoms';

import SplashScreen from '@/components/ui/SplashScreen';
import FloatingSettings from '@/components/landing/FloatingSettings';
import RedirectIfAuthenticated from '@/components/RedirectIfAuthenticated';
import {
  IS_LANDING_DOMAIN,
  IS_APP_DOMAIN,
  IS_DEV,
} from '@/lib/constants';
import useSystemSettings from '@/hooks/useSystemSettings';

// Route Modules
import LandingRoutes from '@/routes/LandingRoutes';
import AdminRoutes from '@/routes/AdminRoutes';
import SuperAdminRoutes from '@/routes/SuperAdminRoutes';
import MemberRoutes from '@/routes/MemberRoutes';
import AuthRoutes from '@/routes/AuthRoutes';

// Shared Lazy Components
const Landing = lazy(() => import('@/pages/static/Landing'));
const Login = lazy(() => import('@/pages/auth/Login'));
const SelfRegister = lazy(() => import('@/pages/auth/SelfRegister'));
const LoanLookup = lazy(() => import('@/pages/admin/LoanLookup'));
const Maintenance = lazy(() => import('@/pages/static/Maintenance'));
const NotFound = lazy(() => import('@/pages/static/NotFound'));

import { DomainRedirect } from '@/lib/routeUtils';

const PageLoader = () => <SplashScreen />;

function App() {
  const { settings, loading } = useSystemSettings();
  const user = useAtomValue(userAtom);
  const isSuperAdmin = user?.role === 'super_admin';

  if (loading) return <PageLoader />;

  // Landing Domain Specific View
  if (IS_LANDING_DOMAIN && !IS_DEV) {
    return (
      <Router>
        <Suspense fallback={<PageLoader />}>
          <LandingRoutes DomainRedirect={DomainRedirect} />
        </Suspense>
        <Toaster position="top-right" richColors />
      </Router>
    );
  }

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {settings?.maintenanceMode && !isSuperAdmin ? (
            <Route path="*" element={<Maintenance />} />
          ) : (
            <>
              {/* On App Domain, / redirects to login or dashboard */}
              <Route path="/" element={<Landing />} />

              {/* Shared Top-level Routes */}
              <Route path="/loan-lookup" element={<LoanLookup />} />
              <Route path="/join/:code?" element={<SelfRegister />} />

              {/* Auth Routes */}
              {AuthRoutes()}

              {/* Feature Routes */}
              {AdminRoutes()}
              {SuperAdminRoutes()}
              {MemberRoutes()}

              {/* Catch All - 404 */}
              <Route path="*" element={<NotFound />} />
            </>
          )}
        </Routes>
      </Suspense>
      <Toaster position="top-right" richColors />
      <FloatingSettings />
    </Router>
  );
}

export default App;
