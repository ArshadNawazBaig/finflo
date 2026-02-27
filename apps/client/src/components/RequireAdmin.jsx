import { Navigate, Outlet } from 'react-router-dom';

const RequireAdmin = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Only super_admin can access super-admin routes.
  // Regular admin and staff are redirected to their dashboard.
  if (user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RequireAdmin;
