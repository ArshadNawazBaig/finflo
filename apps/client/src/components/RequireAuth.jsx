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

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.mustChangePassword && normalizedPath !== '/force-password-change') {
    return <Navigate to="/force-password-change" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
