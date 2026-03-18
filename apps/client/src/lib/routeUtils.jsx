import { Suspense, lazy } from 'react';
import { getAppUrl, getLandingUrl } from '@/lib/constants';

export const withSkeleton = (importFunc, SkeletonFallback) => {
  const LazyComponent = lazy(importFunc);
  return (props) => (
    <Suspense fallback={<SkeletonFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Redirect Helper Component
export const DomainRedirect = ({ to, useAppDomain = true }) => {
  const targetUrl = useAppDomain ? getAppUrl(to) : getLandingUrl(to);
  window.location.href = targetUrl;
  return null;
};
