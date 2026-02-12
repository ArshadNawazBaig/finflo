import { Navigate, Outlet } from 'react-router-dom';

const RequireAdmin = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RequireAdmin;
