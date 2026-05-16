import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAtomValue, useSetAtom } from 'jotai';
import { userAtom } from '@/atoms';
import { isTokenExpired } from '@/lib/jwt';

const RequireAuth = () => {
  const user = useAtomValue(userAtom);
  const setUser = useSetAtom(userAtom);
  const location = useLocation();

  const tokenExpired = !!user && isTokenExpired(user.token);

  useEffect(() => {
    if (tokenExpired) {
      setUser(null);
    }
  }, [tokenExpired, setUser]);

  // Robust path normalized comparison
  const normalizedPath = location.pathname.endsWith('/')
    ? location.pathname.slice(0, -1)
    : location.pathname;

  if (!user || tokenExpired) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.mustChangePassword && normalizedPath !== '/force-password-change') {
    return <Navigate to="/force-password-change" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
