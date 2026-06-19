import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAtomValue } from 'jotai';
import { userAtom } from '@/atoms';

const RequireAuth = () => {
  const user = useAtomValue(userAtom);
  const location = useLocation();

  // Robust path normalized comparison
  const normalizedPath = location.pathname.endsWith('/')
    ? location.pathname.slice(0, -1)
    : location.pathname;

  // Auth presence keys off the cached user OBJECT, not the access token. On web
  // the token isn't persisted (see atoms.js) and is re-minted by a silent refresh
  // (useSessionBootstrap); token EXPIRY is owned by the axios refresh interceptor,
  // which only ends the session (nulls the user) when a refresh genuinely fails —
  // at which point this guard sees no user and bounces to /login.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.mustChangePassword && normalizedPath !== '/force-password-change') {
    return <Navigate to="/force-password-change" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
