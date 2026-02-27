import { Navigate, Outlet } from 'react-router-dom';

const RedirectIfAuthenticated = () => {
  const token = localStorage.getItem('token');

  // Ensure isolation: if hitting admin login, clear any stale member token
  if (!token && localStorage.getItem('memberToken')) {
    localStorage.removeItem('memberToken');
  }

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RedirectIfAuthenticated;
