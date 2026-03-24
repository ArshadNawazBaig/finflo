import { Navigate, Outlet, useLocation } from 'react-router-dom';

const RedirectIfAuthenticated = ({ children }) => {
  const token = localStorage.getItem('user');
  const location = useLocation();

  // Robust path normalized comparison
  const normalizedPath = location.pathname.endsWith('/')
    ? location.pathname.slice(0, -1)
    : location.pathname;

  const isDashboard = normalizedPath === '/dashboard';
  const isForcePassword = normalizedPath === '/force-password-change';

  const hasValidToken = token && token !== 'null' && token !== 'undefined';

  if (
    hasValidToken &&
    !isDashboard &&
    !isForcePassword &&
    normalizedPath !== '/super-admin'
  ) {
    const user = (JSON.parse(localStorage.getItem('user') || '{}') || {});
    if (user?.role === 'super_admin') {
      return <Navigate to="/super-admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children || <Outlet />;
};

export default RedirectIfAuthenticated;

