import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAtomValue } from 'jotai';
import { memberAtom } from '@/atoms';

const RequireMemberAuth = () => {
  const member = useAtomValue(memberAtom);
  const location = useLocation();

  // Robust path normalized comparison
  const normalizedPath = location.pathname.endsWith('/')
    ? location.pathname.slice(0, -1)
    : location.pathname;

  // Auth presence keys off the cached member OBJECT, not the access token. On web
  // the token isn't persisted (see atoms.js) and is re-minted by a silent refresh
  // (useSessionBootstrap); token EXPIRY is owned by the axios refresh interceptor,
  // which only ends the session (nulls the member) when a refresh genuinely fails.
  if (!member) {
    return <Navigate to="/member/login" state={{ from: location }} replace />;
  }

  // Only redirect to force-password-change if not already there
  if (
    member.mustChangePassword &&
    normalizedPath !== '/member/force-password-change'
  ) {
    return <Navigate to="/member/force-password-change" replace />;
  }

  return <Outlet />;
};

export default RequireMemberAuth;
