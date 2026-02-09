import { Navigate, Outlet } from 'react-router-dom';

const RedirectIfAuthenticated = () => {
  const token = localStorage.getItem('token');

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RedirectIfAuthenticated;
