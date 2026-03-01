import { Navigate, Outlet, useLocation } from 'react-router-dom';

const RedirectIfAuthenticated = () => {
  const token = localStorage.getItem('user');
  const location = useLocation();

  // Robust path normalized comparison
  const normalizedPath = location.pathname.endsWith('/')
    ? location.pathname.slice(0, -1)
    : location.pathname;

  // Ensure isolation: if hitting admin login, clear any stale member token
  if (!token && localStorage.getItem('member')) {
    localStorage.removeItem('member');
  }

  const isDashboard = normalizedPath === '/dashboard';
  const isForcePassword = normalizedPath === '/force-password-change';

  if (token && !isDashboard && !isForcePassword) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RedirectIfAuthenticated;
