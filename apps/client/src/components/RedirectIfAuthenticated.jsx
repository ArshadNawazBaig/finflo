import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/atoms';

const RedirectIfAuthenticated = ({ children }) => {
  const user = useAtomValue(userAtom);
  const location = useLocation();

  // Robust path normalized comparison
  const normalizedPath = location.pathname.endsWith('/')
    ? location.pathname.slice(0, -1)
    : location.pathname;

  const isDashboard = normalizedPath === '/dashboard';
  const isForcePassword = normalizedPath === '/force-password-change';

  if (
    user &&
    !isDashboard &&
    !isForcePassword &&
    normalizedPath !== '/super-admin'
  ) {
    if (user?.role === 'super_admin') {
      return <Navigate to="/super-admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children || <Outlet />;
};

export default RedirectIfAuthenticated;

