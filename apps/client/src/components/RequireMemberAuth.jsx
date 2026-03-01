import { Navigate, Outlet, useLocation } from 'react-router-dom';

const RequireMemberAuth = () => {
  const memberToken = localStorage.getItem('member');
  const location = useLocation();

  // Robust path normalized comparison
  const normalizedPath = location.pathname.endsWith('/')
    ? location.pathname.slice(0, -1)
    : location.pathname;

  if (!memberToken) {
    return <Navigate to="/member/login" state={{ from: location }} replace />;
  }

  let member = {};
  try {
    member = JSON.parse(memberToken || '{}');
  } catch (e) {
    console.error('Failed to parse member token', e);
  }

  // Only redirect to force-password-change if not already there
  if (
    member.mustChangePassword &&
    normalizedPath !== '/member/force-password-change'
  ) {
    return <Navigate to="/member/force-password-change" replace />;
  }

  return <Outlet />;
};

export default RequireMemberAuth;
