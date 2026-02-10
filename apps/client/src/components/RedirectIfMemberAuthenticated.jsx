import { Navigate, Outlet } from 'react-router-dom';

const RedirectIfMemberAuthenticated = () => {
  const memberToken = localStorage.getItem('memberToken');

  if (memberToken) {
    return <Navigate to="/member/dashboard" replace />;
  }

  return <Outlet />;
};

export default RedirectIfMemberAuthenticated;
