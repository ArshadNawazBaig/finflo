import { Navigate, Outlet, useLocation } from 'react-router-dom';

const RequireMemberAuth = () => {
  const memberToken = localStorage.getItem('member');
  const location = useLocation();

  if (!memberToken) {
    return <Navigate to="/member/login" state={{ from: location }} replace />;
  }

  const member = JSON.parse(localStorage.getItem('member') || '{}');

  // Only redirect to force-password-change if not already there (prevents infinite loop)
  if (
    member.mustChangePassword &&
    location.pathname !== '/member/force-password-change'
  ) {
    return <Navigate to="/member/force-password-change" replace />;
  }

  return <Outlet />;
};

export default RequireMemberAuth;
