import { Navigate, Outlet, useLocation } from 'react-router-dom';

const RequireAuth = () => {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.mustChangePassword) {
    return <Navigate to="/force-password-change" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
