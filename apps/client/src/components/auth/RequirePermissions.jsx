import { Navigate, useLocation, Outlet } from 'react-router-dom';
import usePermissions from '@/hooks/usePermissions';

const RequirePermissions = ({ permissions = [], any = false }) => {
  const { hasAllPermissions, hasAnyPermission } = usePermissions();
  const location = useLocation();

  const isAuthorized = any
    ? hasAnyPermission(permissions)
    : hasAllPermissions(permissions);

  if (!isAuthorized) {
    // Redirect to dashboard if not authorized
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default RequirePermissions;
