import { Navigate, Outlet, useLocation } from 'react-router-dom';

const RequireAuth = () => {
  const token = localStorage.getItem('user');
  const location = useLocation();

  // Robust path normalized comparison
  const normalizedPath = location.pathname.endsWith('/')
    ? location.pathname.slice(0, -1)
    : location.pathname;

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.mustChangePassword && normalizedPath !== '/force-password-change') {
    return <Navigate to="/force-password-change" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
