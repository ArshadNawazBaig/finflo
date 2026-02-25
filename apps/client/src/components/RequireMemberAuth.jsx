import { Navigate, Outlet, useLocation } from 'react-router-dom';

const RequireMemberAuth = () => {
  const memberToken = localStorage.getItem('memberToken');
  const location = useLocation();

  if (!memberToken) {
    return <Navigate to="/member/login" state={{ from: location }} replace />;
  }

  const member = JSON.parse(localStorage.getItem('member') || '{}');
  if (member.mustChangePassword) {
    return <Navigate to="/member/force-password-change" replace />;
  }

  return <Outlet />;
};

export default RequireMemberAuth;
