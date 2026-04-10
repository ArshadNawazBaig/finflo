import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { IS_DEV } from '@/lib/constants';

const Landing = lazy(() => import('@/pages/static/Landing'));
const PrivacyPolicy = lazy(() => import('@/pages/static/PrivacyPage'));
const TermsOfService = lazy(() => import('@/pages/static/TermsPage'));
const Documentation = lazy(() => import('@/pages/static/Documentation'));
const ApiDocumentation = lazy(() => import('@/pages/static/ApiDocumentation'));
const NotFound = lazy(() => import('@/pages/static/NotFound'));
const FaqPage = lazy(() => import('@/pages/static/FaqPage'));

const LandingRoutes = ({ DomainRedirect }) => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/privacy" element={<PrivacyPolicy />} />
    <Route path="/terms" element={<TermsOfService />} />
    <Route path="/faq" element={<FaqPage />} />
    <Route path="/documentation" element={<Documentation />} />
    <Route path="/documentation/api" element={<ApiDocumentation />} />
    {!IS_DEV && (
      <Route
        path="*"
        element={
          <DomainRedirect
            to={window.location.pathname + window.location.search}
          />
        }
      />
    )}
    {IS_DEV && <Route path="*" element={<NotFound />} />}
  </Routes>
);

export default LandingRoutes;
