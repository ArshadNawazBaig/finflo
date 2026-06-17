import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { memberAtom } from '@/atoms';

const RedirectIfMemberAuthenticated = () => {
  const member = useAtomValue(memberAtom);
  const location = useLocation();

  // Robust path normalized comparison (ignoring trailing slash)
  const normalizedPath = location.pathname.endsWith('/')
    ? location.pathname.slice(0, -1)
    : location.pathname;

  // Allow logged-in members through to the force-password-change page —
  // they need their token to be able to submit a new password.
  // Also never redirect if already on the dashboard.
  const isDashboard = normalizedPath === '/member/dashboard';
  const isForcePassword = normalizedPath === '/member/force-password-change';

  // Presence keys off the member object, not the token (absent on web until the
  // bootstrap refresh re-mints it).
  if (member && !isDashboard && !isForcePassword) {
    return <Navigate to="/member/dashboard" replace />;
  }

  return <Outlet />;
};

export default RedirectIfMemberAuthenticated;
