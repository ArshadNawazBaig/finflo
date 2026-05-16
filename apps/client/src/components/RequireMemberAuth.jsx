import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAtomValue, useSetAtom } from 'jotai';
import { memberAtom } from '@/atoms';
import { isTokenExpired } from '@/lib/jwt';

const RequireMemberAuth = () => {
  const member = useAtomValue(memberAtom);
  const setMember = useSetAtom(memberAtom);
  const location = useLocation();

  const tokenExpired = !!member && isTokenExpired(member.token);

  useEffect(() => {
    if (tokenExpired) {
      setMember(null);
    }
  }, [tokenExpired, setMember]);

  // Robust path normalized comparison
  const normalizedPath = location.pathname.endsWith('/')
    ? location.pathname.slice(0, -1)
    : location.pathname;

  if (!member || tokenExpired) {
    return <Navigate to="/member/login" state={{ from: location }} replace />;
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
