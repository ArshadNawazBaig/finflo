import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAtomValue } from 'jotai';
import { userAtom, memberAtom } from '@/atoms';

import SplashScreen from '@/components/ui/SplashScreen';
import FloatingSettings from '@/components/landing/FloatingSettings';
import RedirectIfAuthenticated from '@/components/RedirectIfAuthenticated';
import ErrorBoundary from '@/components/ErrorBoundary';
import {
  IS_LANDING_DOMAIN,
  IS_APP_DOMAIN,
  IS_DEV,
  IS_NATIVE,
  APP_MODE,
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
const OnboardingScreen = lazy(() => import('@/pages/onboarding/OnboardingScreen'));

import { DomainRedirect } from '@/lib/routeUtils';

// On app.finflo.org, root redirects to /login (or /dashboard if authenticated)
const AppRootRedirect = () => {
  const user = useAtomValue(userAtom);
  const member = useAtomValue(memberAtom);

  // On native, redirect based on APP_MODE and auth state
  if (IS_NATIVE) {
    if (APP_MODE === 'member') {
      return member
        ? <Navigate to="/member/dashboard" replace />
        : <Navigate to="/member/login" replace />;
    }
    // Business mode
    if (user) {
      return user.role === 'super_admin'
        ? <Navigate to="/super-admin" replace />
        : <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Web behavior
  if (user) {
    return user.role === 'super_admin'
      ? <Navigate to="/super-admin" replace />
      : <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
};

const PageLoader = () => <SplashScreen />;

const TestError = () => {
  throw new Error('This is an intentional test error to demonstrate the Error Boundary.');
};

const TestOfflineError = () => {
  throw new Error('Failed to fetch: intentional test for offline UI');
};

import { TooltipProvider } from '@radix-ui/react-tooltip';

function App() {
  const { settings, loading } = useSystemSettings();
  const user = useAtomValue(userAtom);
  const member = useAtomValue(memberAtom);
  const isSuperAdmin = user?.role === 'super_admin';

  // On native platforms, check if onboarding has been completed
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (!IS_NATIVE) return false;
    return !localStorage.getItem('onboarding_complete');
  });

  // Synchronize auth state to a parent domain cookie so the cross-domain landing page can read it
  useEffect(() => {
    if (!IS_DEV) {
      if (user) {
        document.cookie = `finflo_business_auth=true; domain=.finflo.org; path=/; max-age=86400; secure; samesite=lax`;
      } else {
        document.cookie = `finflo_business_auth=; domain=.finflo.org; path=/; max-age=0; secure; samesite=lax`;
      }
      
      if (member) {
        document.cookie = `finflo_member_auth=true; domain=.finflo.org; path=/; max-age=86400; secure; samesite=lax`;
      } else {
        document.cookie = `finflo_member_auth=; domain=.finflo.org; path=/; max-age=0; secure; samesite=lax`;
      }
    }
  }, [user, member]);

  if (loading) return <PageLoader />;

  // Landing Domain Specific View
  if (IS_LANDING_DOMAIN && !IS_DEV) {
    return (
      <ErrorBoundary>
        <Router>
          <TooltipProvider>
            <Suspense fallback={<PageLoader />}>
              <LandingRoutes DomainRedirect={DomainRedirect} />
            </Suspense>
            <Toaster position="top-right" richColors />
            {!IS_NATIVE && <FloatingSettings />}
          </TooltipProvider>
        </Router>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            {/* Native onboarding: show before any routing on first launch */}
            {showOnboarding ? (
              <Routes>
                <Route path="*" element={<OnboardingScreen onComplete={() => setShowOnboarding(false)} />} />
              </Routes>
            ) : (
            <Routes>
              {settings?.maintenanceMode && !isSuperAdmin ? (
                <Route path="*" element={<Maintenance />} />
              ) : (
                <>
                  {/* On App Domain, / redirects to login or dashboard */}
                  {/* In dev mode, show landing at / for convenience (unless native) */}
                  <Route path="/" element={IS_DEV && !IS_NATIVE ? <Landing /> : <AppRootRedirect />} />

                  {/* Shared Top-level Routes — hidden on native APKs */}
                  {!IS_NATIVE && (
                    <>
                      <Route path="/loan-lookup" element={<LoanLookup />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="/terms" element={<TermsOfService />} />
                      <Route path="/faq" element={<FaqPage />} />
                      <Route path="/documentation" element={<Documentation />} />
                      <Route path="/documentation/api" element={<ApiDocumentation />} />
                    </>
                  )}

                  <Route path="/join/:code?" element={<SelfRegister />} />

                  {/* Dev-only: preview onboarding screens in browser */}
                  {IS_DEV && (
                    <Route path="/onboarding" element={<OnboardingScreen onComplete={() => window.history.back()} />} />
                  )}

                  {/* Dev-only: test error boundary */}
                  {IS_DEV && (
                    <>
                      <Route path="/test-error" element={<TestError />} />
                      <Route path="/test-offline" element={<TestOfflineError />} />
                    </>
                  )}

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
            )}
          </Suspense>
          <Toaster position="top-right" richColors />
          {!IS_NATIVE && <FloatingSettings />}
        </TooltipProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
