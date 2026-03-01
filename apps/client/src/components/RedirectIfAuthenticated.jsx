import { Navigate, Outlet } from 'react-router-dom';

const RedirectIfAuthenticated = () => {
  const token = localStorage.getItem('user');

  // Ensure isolation: if hitting admin login, clear any stale member token
  if (!token && localStorage.getItem('member')) {
    localStorage.removeItem('member');
  }

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RedirectIfAuthenticated;
