import { Navigate, Outlet } from 'react-router-dom';

const RequireMemberAuth = () => {
  const memberToken = localStorage.getItem('memberToken');

  if (!memberToken) {
    return <Navigate to="/member/login" replace />;
  }

  return <Outlet />;
};

export default RequireMemberAuth;
