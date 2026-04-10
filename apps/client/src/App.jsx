import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/atoms';

import SplashScreen from '@/components/ui/SplashScreen';
import FloatingSettings from '@/components/landing/FloatingSettings';
import RedirectIfAuthenticated from '@/components/RedirectIfAuthenticated';
import ErrorBoundary from '@/components/ErrorBoundary';
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
const PrivacyPolicy = lazy(() => import('@/pages/static/PrivacyPage'));
const TermsOfService = lazy(() => import('@/pages/static/TermsPage'));
const Documentation = lazy(() => import('@/pages/static/Documentation'));
const ApiDocumentation = lazy(() => import('@/pages/static/ApiDocumentation'));
const Login = lazy(() => import('@/pages/auth/Login'));
const SelfRegister = lazy(() => import('@/pages/auth/SelfRegister'));
const LoanLookup = lazy(() => import('@/pages/admin/LoanLookup'));
const Maintenance = lazy(() => import('@/pages/static/Maintenance'));
const NotFound = lazy(() => import('@/pages/static/NotFound'));
const FaqPage = lazy(() => import('@/pages/static/FaqPage'));

import { DomainRedirect } from '@/lib/routeUtils';

// On app.finflo.org, root redirects to /login (or /dashboard if authenticated)
const AppRootRedirect = () => {
  const user = useAtomValue(userAtom);
  if (user) {
    return user.role === 'super_admin'
      ? <Navigate to="/super-admin" replace />
      : <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
};

const PageLoader = () => <SplashScreen />;

function App() {
  const { settings, loading } = useSystemSettings();
  const user = useAtomValue(userAtom);
  const isSuperAdmin = user?.role === 'super_admin';

  if (loading) return <PageLoader />;

  // Landing Domain Specific View
  if (IS_LANDING_DOMAIN && !IS_DEV) {
    return (
      <ErrorBoundary>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <LandingRoutes DomainRedirect={DomainRedirect} />
          </Suspense>
          <Toaster position="top-right" richColors />
        </Router>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {settings?.maintenanceMode && !isSuperAdmin ? (
              <Route path="*" element={<Maintenance />} />
            ) : (
              <>
                {/* On App Domain, / redirects to login or dashboard */}
                {/* In dev mode, show landing at / for convenience */}
                <Route path="/" element={IS_DEV ? <Landing /> : <AppRootRedirect />} />

                {/* Shared Top-level Routes */}
                <Route path="/loan-lookup" element={<LoanLookup />} />
                <Route path="/join/:code?" element={<SelfRegister />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/faq" element={<FaqPage />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/documentation/api" element={<ApiDocumentation />} />

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
    </ErrorBoundary>
  );
}

export default App;
