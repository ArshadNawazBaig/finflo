import { Navigate, Outlet } from 'react-router-dom';

import { useAtomValue } from 'jotai';
import { userAtom } from '@/atoms';

const RequireAdmin = () => {
  const user = useAtomValue(userAtom);

  // Only super_admin can access super-admin routes.
  // Regular admin and staff are redirected to their dashboard.
  if (user?.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RequireAdmin;
