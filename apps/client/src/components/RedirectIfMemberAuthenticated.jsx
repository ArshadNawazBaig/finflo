import { Navigate, Outlet, useLocation } from 'react-router-dom';

const RedirectIfMemberAuthenticated = () => {
  const memberToken = localStorage.getItem('member');
  const location = useLocation();

  // Allow logged-in members through to the force-password-change page —
  // they need their token to be able to submit a new password.
  if (memberToken && location.pathname !== '/member/force-password-change') {
    return <Navigate to="/member/dashboard" replace />;
  }

  return <Outlet />;
};

export default RedirectIfMemberAuthenticated;
